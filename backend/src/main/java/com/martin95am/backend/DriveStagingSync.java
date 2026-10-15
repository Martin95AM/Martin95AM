package com.martin95am.backend;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class DriveStagingSync {
    @Bean
    ApplicationRunner importDriveRecords(LoopEmailDeliveryRepository repository, ObjectMapper mapper,
            @Value("${app.drive-staging-url:}") String stagingUrl,
            @Value("${app.drive-sync-token:}") String token) {
        return args -> {
            if (stagingUrl.isBlank() || token.isBlank()) return;
            try {
                HttpClient client = HttpClient.newHttpClient();
                String url = stagingUrl + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
                String json = client.send(HttpRequest.newBuilder(URI.create(url)).GET().build(), HttpResponse.BodyHandlers.ofString()).body();
                Map<String, Object> response = mapper.readValue(json, new TypeReference<>() {});
                List<String> imported = new ArrayList<>();
                for (Map<String, Object> item : (List<Map<String, Object>>) response.getOrDefault("records", List.of())) {
                    Map<String, Object> record = (Map<String, Object>) item.get("record");
                    repository.save(new LoopEmailDelivery(String.valueOf(record.get("email")), String.valueOf(record.get("filename"))));
                    imported.add(String.valueOf(item.get("id")));
                }
                if (!imported.isEmpty()) client.send(HttpRequest.newBuilder(URI.create(stagingUrl)).header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(Map.of("action", "ack", "token", token, "ids", imported)))).build(), HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) { /* Leave remote files intact; retry at next local startup. */ }
        };
    }
}
