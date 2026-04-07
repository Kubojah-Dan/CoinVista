package com.coinvista.backend.model;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "alerts")
public class Alert {

    @Id
    private String id;

    private String userId;

    private String coinId;

    private String symbol;

    private String name;

    private Double targetPrice;

    private String direction; // "above" or "below"

    private boolean isTriggered = false;

    private Double lastTriggeredPrice;

    private Instant triggeredAt;

    private Instant notificationSentAt;

    @CreatedDate
    private Instant createdAt = Instant.now();
}
