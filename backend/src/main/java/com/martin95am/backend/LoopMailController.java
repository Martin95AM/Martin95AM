package com.martin95am.backend;

import java.util.Base64;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.core.io.ByteArrayResource;

import jakarta.mail.internet.MimeMessage;

@RestController
@CrossOrigin(origins = "${app.cors-origin:http://localhost:5173}")
public class LoopMailController {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final JavaMailSender mailSender;
    private final LoopEmailDeliveryRepository deliveryRepository;
    private final String from;

    public LoopMailController(JavaMailSender mailSender, LoopEmailDeliveryRepository deliveryRepository, @Value("${app.mail-from}") String from) {
        this.mailSender = mailSender;
        this.deliveryRepository = deliveryRepository;
        this.from = from;
    }

    @PostMapping("/api/loops/email")
    public ResponseEntity<Map<String, String>> emailLoop(@RequestBody LoopEmailRequest request) {
        if (request.email() == null || !EMAIL.matcher(request.email()).matches()
                || request.filename() == null || !request.filename().matches("^[a-zA-Z0-9_-]+-loop\\.(mid|wav)$")
                || request.data() == null || request.data().length() > 4_000_000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos de envío inválidos."));
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(request.data());
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(request.email());
            helper.setSubject("Tu loop de Martin Quest");
            helper.setText("Adjuntamos el loop que creaste en Martin Quest.", false);
            helper.addAttachment(request.filename(), new ByteArrayResource(bytes),
                    request.filename().endsWith(".wav") ? "audio/wav" : "audio/midi");
            mailSender.send(message);
            deliveryRepository.save(new LoopEmailDelivery(request.email(), request.filename()));
            return ResponseEntity.ok(Map.of("message", "Archivo enviado."));
        } catch (Exception exception) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "No se pudo enviar el correo. Revisá la configuración SMTP."));
        }
    }

    public record LoopEmailRequest(String email, String filename, String data) { }
}
