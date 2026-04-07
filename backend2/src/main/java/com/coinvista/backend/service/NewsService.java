package com.coinvista.backend.service;

import com.coinvista.backend.dto.IntelligenceDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class NewsService {

    private final WebClient webClient = WebClient.builder().build();

    @Value("${app.news.cryptopanic-key:}")
    private String cryptoPanicKey;

    @Value("${app.news.gnews-key:}")
    private String gNewsKey;

    @SuppressWarnings("unchecked")
    public List<IntelligenceDto.NewsArticle> fetchCoinNews(String coinName, String symbol, int limit) {
        if (cryptoPanicKey != null && !cryptoPanicKey.isBlank()) {
            try {
                Object response = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .scheme("https")
                                .host("cryptopanic.com")
                                .path("/api/v1/posts/")
                                .queryParam("auth_token", cryptoPanicKey)
                                .queryParam("public", true)
                                .queryParam("kind", "news")
                                .queryParam("currencies", symbol.toUpperCase())
                                .build())
                        .retrieve()
                        .bodyToMono(Object.class)
                        .block();

                if (response instanceof Map<?, ?> map && map.get("results") instanceof List<?> results) {
                    return results.stream()
                            .filter(Map.class::isInstance)
                            .map(item -> (Map<String, Object>) item)
                            .limit(limit)
                            .map(this::fromCryptoPanic)
                            .toList();
                }
            } catch (Exception exception) {
                log.warn("CryptoPanic news fetch failed for {}: {}", symbol, exception.getMessage());
            }
        }

        if (gNewsKey != null && !gNewsKey.isBlank()) {
            try {
                Object response = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .scheme("https")
                                .host("gnews.io")
                                .path("/api/v4/search")
                                .queryParam("q", coinName + " OR " + symbol.toUpperCase())
                                .queryParam("lang", "en")
                                .queryParam("max", limit)
                                .queryParam("apikey", gNewsKey)
                                .build())
                        .retrieve()
                        .bodyToMono(Object.class)
                        .block();

                if (response instanceof Map<?, ?> map && map.get("articles") instanceof List<?> articles) {
                    return articles.stream()
                            .filter(Map.class::isInstance)
                            .map(item -> (Map<String, Object>) item)
                            .limit(limit)
                            .map(this::fromGNews)
                            .toList();
                }
            } catch (Exception exception) {
                log.warn("GNews fetch failed for {}: {}", symbol, exception.getMessage());
            }
        }

        return List.of();
    }

    public boolean hasConfiguredProvider() {
        return (cryptoPanicKey != null && !cryptoPanicKey.isBlank())
                || (gNewsKey != null && !gNewsKey.isBlank());
    }

    @SuppressWarnings("unchecked")
    private IntelligenceDto.NewsArticle fromCryptoPanic(Map<String, Object> payload) {
        IntelligenceDto.NewsArticle article = new IntelligenceDto.NewsArticle();
        article.setTitle(stringValue(payload.get("title")));
        article.setUrl(stringValue(payload.get("url")));
        article.setPublishedAt(parseInstant(payload.get("published_at")));

        Object source = payload.get("source");
        if (source instanceof Map<?, ?> sourceMap) {
            article.setSource(stringValue(((Map<String, Object>) sourceMap).get("title")));
        } else {
            article.setSource("CryptoPanic");
        }
        return article;
    }

    private IntelligenceDto.NewsArticle fromGNews(Map<String, Object> payload) {
        IntelligenceDto.NewsArticle article = new IntelligenceDto.NewsArticle();
        article.setTitle(stringValue(payload.get("title")));
        article.setUrl(stringValue(payload.get("url")));
        article.setPublishedAt(parseInstant(payload.get("publishedAt")));

        Object source = payload.get("source");
        if (source instanceof Map<?, ?> sourceMap) {
            article.setSource(stringValue(((Map<?, ?>) sourceMap).get("name")));
        } else {
            article.setSource("GNews");
        }
        return article;
    }

    private Instant parseInstant(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Instant.parse(value.toString());
        } catch (Exception ignored) {
            return null;
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }
}
