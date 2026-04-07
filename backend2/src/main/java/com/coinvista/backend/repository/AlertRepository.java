package com.coinvista.backend.repository;

import com.coinvista.backend.model.Alert;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AlertRepository extends MongoRepository<Alert, String> {
    List<Alert> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Alert> findByIsTriggeredFalse();
    void deleteByIdAndUserId(String id, String userId);
    void deleteByUserId(String userId);
}
