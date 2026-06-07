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
        
        private Double stopLoss;
        private Double takeProfit;
        private String strategy;
    }

    @Data
    public static class TradeView {
        private String id;
        private String coinId;
        private String symbol;
        private String name;
        private String side; // "long" | "short" (from position)
        private String action; // "buy" | "sell"
        private Double quantity;
        private Double entryPrice;
        private Double exitPrice;
        private Double totalValue;
        private Double realizedPnl;
        private Double pnlPercent;
        private String strategy;
        private String closeReason;
        private Instant openedAt;
        private Instant closedAt;
    }

    @Data
    public static class PositionView {
        private String id;
        private String coinId;
        private String symbol;
        private String name;
        private Double quantity; // size
        private Double averageCost; // entryPrice
        private Double currentPrice;
        private Double marketValue;
        private Double unrealizedPnl;
        private Double roi;
        private String side; // "long" | "short"
        private Double stopLoss;
        private Double takeProfit;
        private String strategy;
        private Instant openedAt;
    }

    @Data
    public static class PerformanceView {
        private String strategy;
        private Integer totalTrades;
        private Double winRate;
        private Double avgRnR;
        private Double sharpeRatio;
        private Double maxDrawdown;
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
        private boolean paperTradingEnabled;
        private boolean liveTradingEnabled;
        private List<PositionView> positions;
        private List<TradeView> trades;
        private List<PerformanceView> performance;
    }
}
