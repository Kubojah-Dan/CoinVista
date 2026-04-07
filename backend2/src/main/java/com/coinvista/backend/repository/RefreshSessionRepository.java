package com.coinvista.backend.repository;

import com.coinvista.backend.model.RefreshSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;

public interface RefreshSessionRepository extends MongoRepository<RefreshSession, String> {
    void deleteByUserId(String userId);
    void deleteByExpiresAtBefore(Instant cutoff);
}
