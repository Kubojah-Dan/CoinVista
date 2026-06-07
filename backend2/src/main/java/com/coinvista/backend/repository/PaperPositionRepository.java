package com.coinvista.backend.repository;

import com.coinvista.backend.model.PaperPosition;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PaperPositionRepository extends MongoRepository<PaperPosition, String> {
    List<PaperPosition> findByUserId(String userId);
    Optional<PaperPosition> findByUserIdAndCoinId(String userId, String coinId);
    void deleteByUserId(String userId);
}
