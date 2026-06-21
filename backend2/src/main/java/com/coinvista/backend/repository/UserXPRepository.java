package com.coinvista.backend.repository;

import com.coinvista.backend.model.UserXP;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface UserXPRepository extends MongoRepository<UserXP, String> {
    Optional<UserXP> findByUserId(String userId);
}
