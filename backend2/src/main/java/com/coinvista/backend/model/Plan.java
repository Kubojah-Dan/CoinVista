package com.coinvista.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "plans")
public class Plan {
    @Id
    private String id; // e.g., "free", "trader", "pro", "elite"

    @Indexed(unique = true)
    private String name; // e.g., "FREE", "TRADER", "PRO", "ELITE"

    private Double monthlyPrice;
    private Double annualPrice;

    private String stripeMonthlyPriceId;
    private String stripeAnnualPriceId;

    private Map<String, Integer> quotas;
}
