package com.coinvista.backend.repository;

import com.coinvista.backend.model.InboxMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface InboxMessageRepository extends MongoRepository<InboxMessage, String> {
    List<InboxMessage> findByUserIdOrderByCreatedAtDesc(String userId);
    long countByUserIdAndIsReadFalse(String userId);
}
