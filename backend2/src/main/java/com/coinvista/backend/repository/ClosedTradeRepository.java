package com.coinvista.backend.repository;

import com.coinvista.backend.model.ClosedTrade;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ClosedTradeRepository extends MongoRepository<ClosedTrade, String> {
    List<ClosedTrade> findByUserIdOrderByClosedAtDesc(String userId);
    List<ClosedTrade> findByUserIdAndStrategy(String userId, String strategy);
    void deleteByUserId(String userId);
}
