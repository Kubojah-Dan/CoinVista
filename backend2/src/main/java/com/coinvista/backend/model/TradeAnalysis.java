package com.coinvista.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "trade_analyses")
public class TradeAnalysis {

    @Id
    private String id;

    @Indexed(unique = true)
    private String tradeId;

    private String strategy;

    private Integer executionScore;

    private List<String> emotions;

    private String aiReport;

    private Instant createdAt = Instant.now();
}
