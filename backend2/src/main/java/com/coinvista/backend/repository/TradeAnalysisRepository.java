package com.coinvista.backend.repository;

import com.coinvista.backend.model.TradeAnalysis;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface TradeAnalysisRepository extends MongoRepository<TradeAnalysis, String> {
    Optional<TradeAnalysis> findByTradeId(String tradeId);
}
