package com.coinvista.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.Instant;
import java.util.List;

public class PaperTradingDto {

    @Data
    public static class TradeRequest {
        @NotBlank
        private String coinId;
        @NotBlank
        private String symbol;
        @NotBlank
        private String name;
        @NotBlank
        @Pattern(regexp = "buy|sell")
        private String side;
        @NotNull
        @Positive
        private Double quantity;
    }

    @Data
    public static class TradeView {
        private String id;
        private String coinId;
        private String symbol;
        private String name;
        private String side;
        private Double quantity;
        private Double executedPrice;
        private Double totalValue;
        private Double realizedPnl;
        private Instant createdAt;
    }

    @Data
    public static class PositionView {
        private String coinId;
        private String symbol;
        private String name;
        private Double quantity;
        private Double averageCost;
        private Double currentPrice;
        private Double marketValue;
        private Double unrealizedPnl;
        private Double roi;
    }

    @Data
    public static class Summary {
        private Double startingBalance;
        private Double cashBalance;
        private Double marketValue;
        private Double totalValue;
        private Double realizedPnl;
        private Double unrealizedPnl;
        private Double totalPnl;
        private List<PositionView> positions;
        private List<TradeView> trades;
    }
}
