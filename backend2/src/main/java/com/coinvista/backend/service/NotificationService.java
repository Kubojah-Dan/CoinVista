package com.coinvista.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.sendgrid.com/v3")
            .build();

    @Value("${app.notifications.sendgrid-api-key:}")
    private String sendGridApiKey;

    @Value("${app.notifications.mail-from:}")
    private String mailFrom;

    @Value("${app.notifications.twilio-sid:}")
    private String twilioSid;

    @Value("${app.notifications.twilio-token:}")
    private String twilioToken;

    public boolean canSendEmail() {
        return sendGridApiKey != null && !sendGridApiKey.isBlank()
                && mailFrom != null && !mailFrom.isBlank();
    }

    public boolean canSendWhatsApp() {
        return twilioSid != null && !twilioSid.isBlank()
                && twilioToken != null && !twilioToken.isBlank();
    }

    public void sendPriceAlertEmail(String to, String coinName, String symbol, double targetPrice,
                                    double currentPrice, String direction) {
        if (!canSendEmail() || to == null || to.isBlank()) {
            return;
        }

        String subject = "CoinVista alert hit for " + symbol.toUpperCase();
        String html = "<p>Your CoinVista price alert just triggered.</p>"
                + "<p><strong>" + coinName + " (" + symbol.toUpperCase() + ")</strong></p>"
                + "<p>Target: $" + String.format("%.2f", targetPrice) + " (" + direction + ")</p>"
                + "<p>Current price: $" + String.format("%.2f", currentPrice) + "</p>";

        Map<String, Object> payload = Map.of(
                "personalizations", List.of(Map.of("to", List.of(Map.of("email", to)))),
                "from", Map.of("email", mailFrom, "name", "CoinVista"),
                "subject", subject,
                "content", List.of(Map.of("type", "text/html", "value", html))
        );

        webClient.post()
                .uri("/mail/send")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + sendGridApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .toBodilessEntity()
                .block();
    }

    public void sendPriceAlertWhatsApp(String to, String coinName, String symbol, double targetPrice,
                                       double currentPrice, String direction) {
        if (!canSendWhatsApp() || to == null || to.isBlank()) {
            return;
        }

        String from = "whatsapp:+14155238886";
        String recipient = to.startsWith("whatsapp:") ? to : "whatsapp:" + to;

        String body = "CoinVista Alert triggered for " + symbol.toUpperCase() + "!\n"
                + coinName + " (" + symbol.toUpperCase() + ")\n"
                + "Target: $" + String.format("%.2f", targetPrice) + " (" + direction + ")\n"
                + "Current price: $" + String.format("%.2f", currentPrice);

        WebClient.create()
                .post()
                .uri("https://api.twilio.com/2010-04-01/Accounts/" + twilioSid + "/Messages.json")
                .headers(headers -> headers.setBasicAuth(twilioSid, twilioToken))
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("To", recipient)
                        .with("From", from)
                        .with("Body", body))
                .retrieve()
                .toBodilessEntity()
                .onErrorResume(e -> {
                    System.err.println("Twilio WhatsApp notification failed: " + e.getMessage());
                    return org.springframework.web.reactive.function.client.ClientResponse
                            .create(org.springframework.http.HttpStatus.OK)
                            .build()
                            .toBodilessEntity();
                })
                .block();
    }
}
