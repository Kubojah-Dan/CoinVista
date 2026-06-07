package com.coinvista.backend.repository;

import com.coinvista.backend.model.AgentPerformance;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AgentPerformanceRepository extends MongoRepository<AgentPerformance, String> {
    List<AgentPerformance> findByUserId(String userId);
    Optional<AgentPerformance> findByUserIdAndStrategy(String userId, String strategy);
    void deleteByUserId(String userId);
}
