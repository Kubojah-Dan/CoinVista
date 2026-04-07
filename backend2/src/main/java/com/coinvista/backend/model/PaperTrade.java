package com.coinvista.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "paper_trades")
public class PaperTrade {

    @Id
    private String id;

    private String userId;

    private String coinId;

    private String symbol;

    private String name;

    private String side;

    private Double quantity;

    private Double executedPrice;

    private Double totalValue;

    private Double realizedPnl = 0.0;

    private Instant createdAt = Instant.now();
}
