package com.coinvista.backend.repository;

import com.coinvista.backend.model.Subscription;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface SubscriptionRepository extends MongoRepository<Subscription, String> {
    Optional<Subscription> findByUserId(String userId);
    Optional<Subscription> findByStripeSubscriptionId(String stripeSubscriptionId);
    Optional<Subscription> findByStripeCustomerId(String stripeCustomerId);
}
