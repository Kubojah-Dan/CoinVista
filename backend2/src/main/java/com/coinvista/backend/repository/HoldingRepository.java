package com.coinvista.backend.repository;

import com.coinvista.backend.model.Holding;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends MongoRepository<Holding, String> {
    List<Holding> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Holding> findByIdAndUserId(String id, String userId);
    void deleteByUserId(String userId);
}
