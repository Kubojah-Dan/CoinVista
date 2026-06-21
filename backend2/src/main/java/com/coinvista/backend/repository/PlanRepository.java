package com.coinvista.backend.repository;

import com.coinvista.backend.model.Plan;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface PlanRepository extends MongoRepository<Plan, String> {
    Optional<Plan> findByName(String name);
}
