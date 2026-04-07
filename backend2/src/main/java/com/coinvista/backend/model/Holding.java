package com.coinvista.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "holdings")
public class Holding {

    @Id
    private String id;

    private String userId;

    private String coinId;

    private String symbol;

    private String name;

    private String encryptedAmount;

    private String encryptedPurchasePrice;

    private Double amount;

    private Double purchasePrice;

    private String notes;

    private Instant entryDate = Instant.now();

    private Instant createdAt = Instant.now();
}
