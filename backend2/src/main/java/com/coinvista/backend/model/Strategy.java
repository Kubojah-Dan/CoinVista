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
@Document(collection = "strategies")
public class Strategy {
    @Id
    private String id;

    @Indexed
    private String userId;

    private String name;
    private String description;
    private String strategyJson; // Serialized React Flow nodes and edges JSON representation
    private boolean isPublic = false;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
