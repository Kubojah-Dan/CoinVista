package com.coinvista.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "user_xp")
public class UserXP {
    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private int xp = 0;
    private int level = 1;
    private List<String> badges = new ArrayList<>();
}
