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
@Document(collection = "follows")
public class Follow {
    @Id
    private String id;

    @Indexed
    private String followerId;

    @Indexed
    private String followingId;

    private boolean copyTradingEnabled = false;
    private double copyAllocationPercent = 10.0; // Allocates percentage of portfolio cash

    private Instant createdAt = Instant.now();
}
