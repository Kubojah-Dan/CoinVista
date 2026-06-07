package com.coinvista.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "agent_performance")
public class AgentPerformance {

    @Id
    private String id;

    private String userId;

    private String strategy;

    private Integer totalTrades = 0;

    private Double winRate = 0.0;

    private Double avgRnR = 0.0;

    private Double sharpeRatio = 0.0;

    private Double maxDrawdown = 0.0;

    private Instant updatedAt = Instant.now();
}
