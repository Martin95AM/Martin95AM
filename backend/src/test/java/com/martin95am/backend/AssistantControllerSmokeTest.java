package com.martin95am.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Proxy;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatus;

/** Run as a plain Java program against a local fake Responses API. */
public class AssistantControllerSmokeTest {
    public static void main(String[] args) throws Exception {
        if (args.length > 0 && "live".equals(args[0])) {
            runLiveConversation();
            return;
        }
        ObjectMapper mapper = new ObjectMapper();
        List<JsonNode> requests = new ArrayList<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/responses", exchange -> {
            try {
                if (!"Bearer test-only".equals(exchange.getRequestHeaders().getFirst("Authorization"))) {
                    exchange.sendResponseHeaders(401, -1);
                    return;
                }
                requests.add(mapper.readTree(exchange.getRequestBody()));
                byte[] response = """
                    {"status":"completed","output":[{"type":"message","content":[{"type":"output_text","text":"Respuesta de prueba."}]}]}
                    """.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.length);
                exchange.getResponseBody().write(response);
            } finally {
                exchange.close();
            }
        });
        server.start();
        try {
            String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/v1/responses";
            AssistantController controller = new AssistantController(mapper, "test-only", "test-model", url,
                    new ByteArrayResource("Martín trabaja en audio y tecnología.".getBytes(StandardCharsets.UTF_8)));
            HttpServletRequest visitor = (HttpServletRequest) Proxy.newProxyInstance(
                    HttpServletRequest.class.getClassLoader(), new Class<?>[] {HttpServletRequest.class},
                    (proxy, method, arguments) -> "getRemoteAddr".equals(method.getName()) ? "127.0.0.1" : null);

            String[] messages = {"hola como andas?", "bien bien aqui estudiando", "quiero saber de ti",
                    "cuentame sobre el", "cuentame sobre las habilidades"};
            String sessionId = null;
            for (String message : messages) {
                var result = controller.chat(new AssistantController.ChatRequest(message, sessionId), visitor);
                require(result.getStatusCode() == HttpStatus.OK, "Chat request failed");
                sessionId = result.getBody().get("sessionId");
                require("Respuesta de prueba.".equals(result.getBody().get("reply")), "Unexpected reply");
            }
            require(requests.size() == messages.length, "Expected one API call per turn");
            require(!requests.get(0).path("store").asBoolean(), "Model responses should not be stored");
            require(requests.get(4).path("instructions").asText().contains("PERFIL PÚBLICO APROBADO"), "Missing profile instructions");
            JsonNode history = requests.get(4).path("input");
            require(history.size() == 9, "Five turns should include four user and four assistant messages");
            require("hola como andas?".equals(history.get(0).path("content").asText()), "Conversation lost its first turn");
            require("cuentame sobre las habilidades".equals(history.get(8).path("content").asText()), "Wrong latest turn");
            require(controller.chat(new AssistantController.ChatRequest("", sessionId), visitor).getStatusCode() == HttpStatus.BAD_REQUEST,
                    "Empty message should be rejected");
            var privateReply = controller.chat(new AssistantController.ChatRequest("¿Cuál es el DNI de Martín?", sessionId), visitor);
            require(privateReply.getStatusCode() == HttpStatus.OK && privateReply.getBody().get("reply").contains("privado"),
                    "Private data should be refused");
            require(requests.size() == messages.length, "Private requests should not reach the model");
            AssistantController withoutKey = new AssistantController(mapper, "", "test-model", url,
                    new ByteArrayResource("Perfil".getBytes(StandardCharsets.UTF_8)));
            require(withoutKey.chat(new AssistantController.ChatRequest("hola", null), visitor).getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE,
                    "Missing key should fail clearly");
            System.out.println("AssistantController smoke test passed");
        } finally {
            server.stop(0);
        }
    }

    private static void runLiveConversation() throws Exception {
        String key = System.getenv("OPENAI_API_KEY");
        require(key != null && !key.isBlank(), "OPENAI_API_KEY is not configured");
        AssistantController controller = new AssistantController(new ObjectMapper(), key, "gpt-5.4-mini",
                "https://api.openai.com/v1/responses", new FileSystemResource("src/main/resources/assistant-profile.txt"));
        HttpServletRequest visitor = (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(), new Class<?>[] {HttpServletRequest.class},
                (proxy, method, arguments) -> "getRemoteAddr".equals(method.getName()) ? "127.0.0.1" : null);
        String sessionId = null;
        for (String message : new String[] {"hola como andas?", "bien bien aqui estudiando", "quiero saber de ti",
                "cuentame sobre el", "cuentame sobre las habilidades"}) {
            var result = controller.chat(new AssistantController.ChatRequest(message, sessionId), visitor);
            require(result.getStatusCode() == HttpStatus.OK, "Live request failed: " + result.getBody().get("message"));
            sessionId = result.getBody().get("sessionId");
            System.out.println(message + " -> " + result.getBody().get("reply"));
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
