package com.coinvista.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    private String password;

    private String avatarUrl;

    private String authProvider = "local";

    private String providerId;

    private List<String> watchlist = new ArrayList<>();

    private List<String> alerts = new ArrayList<>();

    private boolean privacyModeEnabled = false;

    private boolean emailNotificationsEnabled = true;

    private boolean twoFactorEnabled = false;

    private String encryptedTotpSecret;

    private String encryptedPendingTotpSecret;

    private String walletAddress;

    private Double paperStartingBalance = 10000.0;

    private Double paperCashBalance = 10000.0;

    private boolean emailVerified = false;

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();
}
