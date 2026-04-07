package com.coinvista.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.Instant;
import java.util.List;

public class HoldingDto {

    @Data
    public static class CreateRequest {
        private String coinId;
        @NotBlank
        private String symbol;
        private String name;
        @NotNull @Positive
        private Double amount;
        @NotNull @Positive
        private Double purchasePrice;
        private String notes;
    }

    @Data
    public static class View {
        private String id;
        private String coinId;
        private String symbol;
        private String name;
        private Double amount;
        private Double purchasePrice;
        private Double currentPrice;
        private Double currentValue;
        private Double investedValue;
        private Double profitLoss;
        private Double roi;
        private String notes;
        private Instant entryDate;
        private Instant createdAt;
    }

    @Data
    public static class AllocationSlice {
        private String name;
        private String symbol;
        private Double value;
        private Double percentage;
    }

    @Data
    public static class Summary {
        private Double totalInvested;
        private Double totalValue;
        private Double profitLoss;
        private Double roi;
        private Double diversificationScore;
        private Integer holdingCount;
        private List<View> holdings;
        private List<AllocationSlice> allocation;
    }
}
