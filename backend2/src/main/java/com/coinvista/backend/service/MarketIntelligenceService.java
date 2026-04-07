package com.coinvista.backend.service;

import com.coinvista.backend.dto.IntelligenceDto;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class MarketIntelligenceService {

    private static final Set<String> POSITIVE_TERMS = Set.of(
            "surge", "rally", "adoption", "breakout", "bull", "approval", "partnership",
            "growth", "record", "upgrade", "rebound", "strong", "gain"
    );
    private static final Set<String> NEGATIVE_TERMS = Set.of(
            "crash", "hack", "lawsuit", "fear", "selloff", "dump", "ban", "outage",
            "exploit", "decline", "investigation", "risk", "bear", "liquidation"
    );

    private final CoinGeckoService coinGeckoService;
    private final NewsService newsService;

    public MarketIntelligenceService(CoinGeckoService coinGeckoService, NewsService newsService) {
        this.coinGeckoService = coinGeckoService;
        this.newsService = newsService;
    }

    @SuppressWarnings("unchecked")
    public IntelligenceDto.Response buildInsights(String coinId) {
        Map<String, Object> details = asObjectMap(coinGeckoService.getCoinDetails(coinId));
        Map<String, Object> marketChart = asObjectMap(coinGeckoService.getCoinChart(coinId, "usd", 30));

        String coinName = stringValue(details.get("name"));
        String symbol = stringValue(details.get("symbol")).toUpperCase(Locale.US);

        List<Double> prices = extractSeries((List<?>) marketChart.get("prices"));
        List<Double> volumes = extractSeries((List<?>) marketChart.get("total_volumes"));
        double currentPrice = resolveCurrentPrice(details, prices);
        boolean newsProviderConfigured = newsService.hasConfiguredProvider();

        List<IntelligenceDto.NewsArticle> news = newsService.fetchCoinNews(coinName, symbol, 6);
        IntelligenceDto.Sentiment sentiment = buildSentiment(news, prices, newsProviderConfigured);
        IntelligenceDto.Anomaly anomaly = buildAnomaly(prices, volumes);
        IntelligenceDto.Prediction prediction = buildPrediction(currentPrice, prices);

        IntelligenceDto.Response response = new IntelligenceDto.Response();
        response.setCoinId(coinId);
        response.setCoinName(coinName);
        response.setSymbol(symbol);
        response.setPrediction(prediction);
        response.setSentiment(sentiment);
        response.setAnomaly(anomaly);
        response.setNews(news);
        response.setLocalModelDataAvailable(hasLocalData(symbol));
        response.setDataSourceNote(news.isEmpty()
                ? (newsProviderConfigured
                    ? "A news provider is configured, but no recent headlines were returned for this coin right now."
                    : "Configure CRYPTOPANIC_API_KEY or GNEWS_API_KEY to enrich sentiment with live headlines.")
                : "Sentiment blends recent headlines with short-term price momentum.");
        return response;
    }

    private IntelligenceDto.Prediction buildPrediction(double currentPrice, List<Double> prices) {
        List<Double> returns = calculateReturns(prices);
        double meanReturn = mean(lastN(returns, 7));
        double volatility = standardDeviation(lastN(returns, 14));

        double predictedPrice = currentPrice * (1.0 + meanReturn);
        double confidenceLow = currentPrice * (1.0 + (meanReturn - volatility));
        double confidenceHigh = currentPrice * (1.0 + (meanReturn + volatility));

        IntelligenceDto.Prediction prediction = new IntelligenceDto.Prediction();
        prediction.setHorizonHours(24);
        prediction.setCurrentPrice(round(currentPrice));
        prediction.setPredictedPrice(round(predictedPrice));
        prediction.setExpectedReturn(round(meanReturn * 100.0));
        prediction.setConfidenceLow(round(Math.max(0.0, confidenceLow)));
        prediction.setConfidenceHigh(round(Math.max(0.0, confidenceHigh)));
        prediction.setModelLabel("Trend/volatility baseline forecast");
        prediction.setDisclaimer("Experimental forecast for research only. Not financial advice.");
        return prediction;
    }

    private IntelligenceDto.Sentiment buildSentiment(List<IntelligenceDto.NewsArticle> news, List<Double> prices, boolean newsProviderConfigured) {
        double headlineScore = 0.0;
        for (IntelligenceDto.NewsArticle article : news) {
            double articleScore = headlineSentiment(article.getTitle());
            article.setSentimentLabel(articleScore > 0 ? "bullish" : articleScore < 0 ? "bearish" : "neutral");
            headlineScore += articleScore;
        }

        List<Double> returns = calculateReturns(prices);
        double momentum = mean(lastN(returns, 5)) * 100.0;
        double score = clamp(50.0 + (headlineScore * 8.0) + momentum, 0.0, 100.0);

        IntelligenceDto.Sentiment sentiment = new IntelligenceDto.Sentiment();
        sentiment.setScore(round(score));
        sentiment.setLabel(labelForSentiment(score));
        sentiment.setSummary(summaryForSentiment(score, news.size(), newsProviderConfigured));
        sentiment.setArticleCount(news.size());
        return sentiment;
    }

    private IntelligenceDto.Anomaly buildAnomaly(List<Double> prices, List<Double> volumes) {
        List<Double> returns = calculateReturns(prices);
        double latestReturn = returns.isEmpty() ? 0.0 : returns.get(returns.size() - 1);
        double returnMean = mean(lastN(returns, 14));
        double returnStd = standardDeviation(lastN(returns, 14));
        double priceZScore = returnStd > 0 ? (latestReturn - returnMean) / returnStd : 0.0;

        double latestVolume = volumes.isEmpty() ? 0.0 : volumes.get(volumes.size() - 1);
        double volumeMean = mean(lastN(volumes, 14));
        double volumeStd = standardDeviation(lastN(volumes, 14));
        double volumeZScore = volumeStd > 0 ? (latestVolume - volumeMean) / volumeStd : 0.0;

        double anomalyScore = Math.max(Math.abs(priceZScore), Math.abs(volumeZScore));
        IntelligenceDto.Anomaly anomaly = new IntelligenceDto.Anomaly();
        anomaly.setDetected(anomalyScore >= 2.0);
        anomaly.setSeverity(anomalyScore >= 3.5 ? "high" : anomalyScore >= 2.0 ? "medium" : "low");
        anomaly.setPriceZScore(round(priceZScore));
        anomaly.setVolumeZScore(round(volumeZScore));
        anomaly.setMessage(anomaly.isDetected()
                ? "Recent movement is materially outside the coin's short-term trading baseline."
                : "No major short-term anomaly detected in price or volume.");
        return anomaly;
    }

    private List<Double> extractSeries(List<?> rawSeries) {
        List<Double> values = new ArrayList<>();
        if (rawSeries == null) {
            return values;
        }

        for (Object point : rawSeries) {
            if (point instanceof List<?> pair && pair.size() >= 2) {
                Object value = pair.get(1);
                if (value instanceof Number number) {
                    values.add(number.doubleValue());
                }
            }
        }
        return values;
    }

    private List<Double> calculateReturns(List<Double> prices) {
        List<Double> returns = new ArrayList<>();
        for (int index = 1; index < prices.size(); index++) {
            double previous = prices.get(index - 1);
            double current = prices.get(index);
            if (previous != 0.0) {
                returns.add((current / previous) - 1.0);
            }
        }
        return returns;
    }

    private List<Double> lastN(List<Double> values, int n) {
        if (values.isEmpty()) {
            return List.of();
        }
        int start = Math.max(0, values.size() - n);
        return values.subList(start, values.size());
    }

    private double mean(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        double total = 0.0;
        for (double value : values) {
            total += value;
        }
        return total / values.size();
    }

    private double standardDeviation(List<Double> values) {
        if (values == null || values.size() < 2) {
            return 0.0;
        }
        double mean = mean(values);
        double total = 0.0;
        for (double value : values) {
            double diff = value - mean;
            total += diff * diff;
        }
        return Math.sqrt(total / values.size());
    }

    private double headlineSentiment(String headline) {
        if (headline == null || headline.isBlank()) {
            return 0.0;
        }

        String normalized = headline.toLowerCase(Locale.US);
        double score = 0.0;
        for (String term : POSITIVE_TERMS) {
            if (normalized.contains(term)) {
                score += 1.0;
            }
        }
        for (String term : NEGATIVE_TERMS) {
            if (normalized.contains(term)) {
                score -= 1.0;
            }
        }
        return score;
    }

    private String labelForSentiment(double score) {
        if (score >= 75) {
            return "Extreme Greed";
        }
        if (score >= 60) {
            return "Greed";
        }
        if (score >= 40) {
            return "Neutral";
        }
        if (score >= 25) {
            return "Fear";
        }
        return "Extreme Fear";
    }

    private String summaryForSentiment(double score, int articleCount, boolean newsProviderConfigured) {
        if (articleCount == 0) {
            return newsProviderConfigured
                    ? "No recent headline matches were returned, so this score currently leans on market momentum."
                    : "Live headline feeds are not configured yet, so this score leans on market momentum.";
        }
        if (score >= 60) {
            return "Headline tone and short-term momentum are skewing constructive.";
        }
        if (score <= 40) {
            return "Recent coverage and market action are leaning risk-off.";
        }
        return "Signals are mixed, with no dominant fear or greed regime.";
    }

    private boolean hasLocalData(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return false;
        }

        String fileName = symbol.toLowerCase(Locale.US) + "_ohlcv.csv";
        return Files.exists(Path.of("data", "processed", fileName))
                || Files.exists(Path.of("..", "data", "processed", fileName));
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asObjectMap(Object value) {
        if (value instanceof Map<?, ?> rawMap) {
            return (Map<String, Object>) rawMap;
        }
        return Map.of();
    }

    private double resolveCurrentPrice(Map<String, Object> details, List<Double> prices) {
        if (!prices.isEmpty()) {
            return prices.get(prices.size() - 1);
        }

        Object marketData = details.get("market_data");
        if (marketData instanceof Map<?, ?> marketDataMap) {
            Object currentPrice = marketDataMap.get("current_price");
            if (currentPrice instanceof Map<?, ?> priceMap) {
                Object usdPrice = priceMap.get("usd");
                if (usdPrice instanceof Number number) {
                    return number.doubleValue();
                }
                if (usdPrice instanceof String text && !text.isBlank()) {
                    return Double.parseDouble(text);
                }
            }
        }

        return 0.0;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
