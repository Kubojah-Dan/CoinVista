package com.coinvista.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "inbox_messages")
public class InboxMessage {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String title;

    private String content; // markdown report

    private boolean isRead = false;

    private Instant createdAt = Instant.now();
}
