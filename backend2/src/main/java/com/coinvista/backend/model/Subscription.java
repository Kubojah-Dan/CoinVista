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
@Document(collection = "subscriptions")
public class Subscription {
    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private String planId; // references Plan.id ("free", "trader", etc.)

    private String stripeCustomerId;
    private String stripeSubscriptionId;

    private String status; // active, trialing, past_due, canceled, incomplete

    private Instant currentPeriodStart;
    private Instant currentPeriodEnd;

    private boolean cancelAtPeriodEnd;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
