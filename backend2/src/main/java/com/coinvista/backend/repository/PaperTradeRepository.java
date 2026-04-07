package com.coinvista.backend.repository;

import com.coinvista.backend.model.PaperTrade;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PaperTradeRepository extends MongoRepository<PaperTrade, String> {
    List<PaperTrade> findByUserIdOrderByCreatedAtDesc(String userId);
    List<PaperTrade> findByUserIdOrderByCreatedAtAsc(String userId);
    void deleteByUserId(String userId);
}
