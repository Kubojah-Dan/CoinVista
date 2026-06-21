package com.coinvista.backend.repository;

import com.coinvista.backend.model.UsageQuota;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface UsageQuotaRepository extends MongoRepository<UsageQuota, String> {
    Optional<UsageQuota> findByUserId(String userId);
}
