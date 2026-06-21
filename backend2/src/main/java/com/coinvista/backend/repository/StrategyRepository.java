package com.coinvista.backend.repository;

import com.coinvista.backend.model.Strategy;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface StrategyRepository extends MongoRepository<Strategy, String> {
    List<Strategy> findByUserId(String userId);
    List<Strategy> findByIsPublicTrue();
}
