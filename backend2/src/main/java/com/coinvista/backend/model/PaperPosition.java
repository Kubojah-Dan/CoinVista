package com.coinvista.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "paper_positions")
public class PaperPosition {

    @Id
    private String id;

    private String userId;

    private String coinId;

    private String symbol;

    private String name;

    private Double entryPrice;

    private Double size;

    private String side; // "long" | "short"

    private Double stopLoss;

    private Double takeProfit;

    private String strategy;

    private Instant openedAt = Instant.now();
}
