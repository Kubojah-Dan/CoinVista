package com.coinvista.backend.repository;

import com.coinvista.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByAuthProviderAndProviderId(String authProvider, String providerId);
    boolean existsByEmail(String email);
}
