package com.coinvista.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "usage_quotas")
public class UsageQuota {
    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private Integer aiQueriesUsed = 0;
    private Integer backtestRunsUsed = 0;

    private Instant resetAt = Instant.now().plus(java.time.Duration.ofDays(7));
    private Instant updatedAt = Instant.now();
}
