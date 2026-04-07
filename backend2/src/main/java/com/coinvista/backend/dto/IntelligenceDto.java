package com.coinvista.backend.dto;

import lombok.Data;

import java.time.Instant;
import java.util.List;

public class IntelligenceDto {

    @Data
    public static class Response {
        private String coinId;
        private String coinName;
        private String symbol;
        private Prediction prediction;
        private Sentiment sentiment;
        private Anomaly anomaly;
        private List<NewsArticle> news;
        private boolean localModelDataAvailable;
        private String dataSourceNote;
    }

    @Data
    public static class Prediction {
        private int horizonHours;
        private double currentPrice;
        private double predictedPrice;
        private double expectedReturn;
        private double confidenceLow;
        private double confidenceHigh;
        private String modelLabel;
        private String disclaimer;
    }

    @Data
    public static class Sentiment {
        private double score;
        private String label;
        private String summary;
        private int articleCount;
    }

    @Data
    public static class Anomaly {
        private boolean detected;
        private String severity;
        private double priceZScore;
        private double volumeZScore;
        private String message;
    }

    @Data
    public static class NewsArticle {
        private String title;
        private String url;
        private String source;
        private Instant publishedAt;
        private String sentimentLabel;
    }
}
