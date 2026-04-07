package com.coinvista.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "refresh_sessions")
public class RefreshSession {

    @Id
    private String id;

    private String userId;

    private String tokenHash;

    private String userAgent;

    private String ipAddress;

    private Instant expiresAt;

    private Instant revokedAt;

    private Instant createdAt = Instant.now();
}
