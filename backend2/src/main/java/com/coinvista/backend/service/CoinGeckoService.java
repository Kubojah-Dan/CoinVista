package com.coinvista.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Supplier;
import java.time.Duration;
import java.time.Instant;

@Slf4j
@Service
public class CoinGeckoService {

    private static final String MARKET_ENDPOINT = "coins/markets";
    private final WebClient client;
    private final ConcurrentMap<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, CacheEntry> marketItemCache = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Instant> endpointBackoffUntil = new ConcurrentHashMap<>();

    private static final Duration MARKET_CACHE_TTL = Duration.ofSeconds(75);
    private static final Duration MARKET_RATE_LIMIT_BACKOFF = Duration.ofSeconds(90);

    @Value("${app.coingecko.api-key:}")
    private String apiKey;

    public CoinGeckoService(@Qualifier("coingeckoClient") WebClient client) {
        this.client = client;
    }

    // Returns a RequestHeadersUriSpec with the API key header pre-set
    private WebClient.RequestHeadersUriSpec<?> get() {
        WebClient.RequestHeadersUriSpec<?> spec = client.get();
        if (apiKey != null && !apiKey.isBlank()) {
            spec.header("x-cg-demo-api-key", apiKey);
        }
        return spec;
    }

    public Object getTopCoins(String currency, int page, int perPage) {
        return fetchCached("top:" + currency + ":" + page + ":" + perPage, MARKET_CACHE_TTL, () -> get()
            .uri(u -> u.path("/coins/markets")
                .queryParam("vs_currency", currency)
                .queryParam("order", "market_cap_desc")
                .queryParam("per_page", perPage)
                .queryParam("page", page)
                .queryParam("sparkline", false)
                .build())
            .retrieve()
            .bodyToMono(Object.class)
            .block(), response -> {
                cacheMarketItems(currency, response);
                clearBackoff(MARKET_ENDPOINT);
            }, List.of());
    }

    public Object getCoinDetails(String coinId) {
        return fetchCached("details:" + coinId, Duration.ofMinutes(2), () -> get()
            .uri(u -> u.path("/coins/{id}")
                .queryParam("localization", false)
                .queryParam("tickers", false)
                .queryParam("market_data", true)
                .queryParam("community_data", false)
                .queryParam("developer_data", false)
                .build(coinId))
            .retrieve()
            .bodyToMono(Object.class)
            .block(), Map.of());
    }

    public Object getCoinChart(String coinId, String currency, int days) {
        return fetchCached("chart:" + coinId + ":" + currency + ":" + days, Duration.ofMinutes(2), () -> get()
            .uri(u -> u.path("/coins/{id}/market_chart")
                .queryParam("vs_currency", currency)
                .queryParam("days", days)
                .build(coinId))
            .retrieve()
            .bodyToMono(Object.class)
            .block(), Map.of());
    }

    public Object searchCoins(String query) {
        return get()
            .uri(u -> u.path("/search")
                .queryParam("query", query)
                .build())
            .retrieve()
            .bodyToMono(Object.class)
            .block();
    }

    public Object getTrendingCoins() {
        return fetchCached("trending", Duration.ofMinutes(2), () -> get()
            .uri("/search/trending")
            .retrieve()
            .bodyToMono(Object.class)
            .block(), Map.of());
    }

    public Object getGlobalData() {
        Object response = fetchCached("global", Duration.ofMinutes(2), () -> get()
            .uri("/global")
            .retrieve()
            .bodyToMono(Object.class)
            .block(), Map.of());

        // Unwrap the "data" key, same as the Node.js service
        if (response instanceof Map<?, ?> map && map.containsKey("data")) {
            return map.get("data");
        }
        return response;
    }

    public Object getCoinsPrices(List<String> coinIds, String currency) {
        List<String> normalizedCoinIds = normalizeCoinIds(coinIds);
        if (normalizedCoinIds.isEmpty()) {
            return List.of();
        }

        String normalizedCurrency = normalizeCurrency(currency);
        String ids = String.join(",", normalizedCoinIds);
        String cacheKey = marketCacheKey(normalizedCurrency, normalizedCoinIds);
        CacheEntry directCache = cache.get(cacheKey);

        if (isFresh(directCache)) {
            return directCache.value();
        }

        List<Map<String, Object>> freshSnapshot = assembleMarketSnapshot(normalizedCoinIds, normalizedCurrency, false);
        if (freshSnapshot.size() == normalizedCoinIds.size()) {
            return freshSnapshot;
        }

        if (isInBackoff(MARKET_ENDPOINT)) {
            List<Map<String, Object>> staleSnapshot = assembleMarketSnapshot(normalizedCoinIds, normalizedCurrency, true);
            if (!staleSnapshot.isEmpty()) {
                log.warn("CoinGecko market endpoint is cooling down. Reusing cached market snapshots for {}.", ids);
                return staleSnapshot;
            }
            if (directCache != null) {
                return directCache.value();
            }
            return List.of();
        }

        try {
            Object response = get()
                    .uri(u -> u.path("/coins/markets")
                            .queryParam("vs_currency", normalizedCurrency)
                            .queryParam("ids", ids)
                            .queryParam("sparkline", false)
                            .build())
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();

            cache.put(cacheKey, new CacheEntry(response, Instant.now().plus(MARKET_CACHE_TTL)));
            cacheMarketItems(normalizedCurrency, response);
            clearBackoff(MARKET_ENDPOINT);
            return response;
        } catch (WebClientResponseException.TooManyRequests exception) {
            setBackoff(MARKET_ENDPOINT, MARKET_RATE_LIMIT_BACKOFF);
            List<Map<String, Object>> staleSnapshot = assembleMarketSnapshot(normalizedCoinIds, normalizedCurrency, true);
            if (!staleSnapshot.isEmpty()) {
                log.warn("CoinGecko rate limit hit for {}. Reusing cached market snapshots.", cacheKey);
                return staleSnapshot;
            }
            if (directCache != null) {
                log.warn("CoinGecko rate limit hit for {}. Reusing cached batch response.", cacheKey);
                return directCache.value();
            }
            log.warn("CoinGecko rate limit hit for {} with no cached price data available.", cacheKey);
            return List.of();
        } catch (Exception exception) {
            List<Map<String, Object>> staleSnapshot = assembleMarketSnapshot(normalizedCoinIds, normalizedCurrency, true);
            if (!staleSnapshot.isEmpty()) {
                log.warn("CoinGecko request failed for {}. Reusing cached market snapshots: {}", cacheKey, exception.getMessage());
                return staleSnapshot;
            }
            if (directCache != null) {
                log.warn("CoinGecko request failed for {}. Reusing cached batch response: {}", cacheKey, exception.getMessage());
                return directCache.value();
            }
            throw exception;
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getCoinsMarketData(List<String> coinIds, String currency) {
        Object response = getCoinsPrices(coinIds, currency);
        if (!(response instanceof List<?> rawList)) {
            return List.of();
        }

        List<Map<String, Object>> parsed = new ArrayList<>();
        for (Object item : rawList) {
            if (item instanceof Map<?, ?> rawMap) {
                parsed.add((Map<String, Object>) rawMap);
            }
        }
        return parsed;
    }

    public double getCurrentPrice(String coinId, String currency) {
        String normalizedCoinId = coinId == null ? "" : coinId.trim().toLowerCase(Locale.US);
        String normalizedCurrency = normalizeCurrency(currency);
        CacheEntry cachedMarketItem = marketItemCache.get(marketItemCacheKey(normalizedCurrency, normalizedCoinId));
        if (cachedMarketItem != null && cachedMarketItem.value() instanceof Map<?, ?> rawMap) {
            Object cachedPrice = rawMap.get("current_price");
            if (cachedPrice != null) {
                return toDouble(cachedPrice);
            }
        }

        List<Map<String, Object>> marketData = getCoinsMarketData(List.of(coinId), currency);
        if (marketData.isEmpty()) {
            Object detailsResponse = getCoinDetails(normalizedCoinId);
            if (detailsResponse instanceof Map<?, ?> detailsMap
                    && detailsMap.get("market_data") instanceof Map<?, ?> marketDataMap
                    && marketDataMap.get("current_price") instanceof Map<?, ?> currentPriceMap) {
                Object currentPrice = currentPriceMap.get(normalizedCurrency);
                if (currentPrice != null) {
                    return toDouble(currentPrice);
                }
            }
            throw new IllegalArgumentException("Coin price unavailable right now. Please retry in a moment.");
        }
        return toDouble(marketData.get(0).get("current_price"));
    }

    public double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Double.parseDouble(text);
        }
        return 0.0;
    }

    private Object fetchCached(String key, Duration ttl, Supplier<Object> fetcher, Object fallback) {
        return fetchCached(key, ttl, fetcher, ignored -> {}, fallback);
    }

    private Object fetchCached(String key, Duration ttl, Supplier<Object> fetcher, java.util.function.Consumer<Object> onSuccess, Object fallback) {
        CacheEntry cached = cache.get(key);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.value();
        }

        try {
            Object value = fetcher.get();
            cache.put(key, new CacheEntry(value, Instant.now().plus(ttl)));
            onSuccess.accept(value);
            return value;
        } catch (WebClientResponseException.TooManyRequests exception) {
            if (cached != null) {
                log.warn("CoinGecko rate limit hit for {}. Reusing cached response.", key);
                return cached.value();
            }
            log.warn("CoinGecko rate limit hit for {} with no cache available. Returning fallback.", key);
            return fallback;
        } catch (Exception exception) {
            if (cached != null) {
                log.warn("CoinGecko request failed for {}. Reusing cached response: {}", key, exception.getMessage());
                return cached.value();
            }
            throw exception;
        }
    }

    private String normalizeCurrency(String currency) {
        return currency == null || currency.isBlank() ? "usd" : currency.trim().toLowerCase(Locale.US);
    }

    private List<String> normalizeCoinIds(List<String> coinIds) {
        if (coinIds == null || coinIds.isEmpty()) {
            return List.of();
        }

        List<String> normalized = new ArrayList<>();
        for (String coinId : coinIds) {
            if (coinId == null) {
                continue;
            }
            String sanitized = coinId.trim().toLowerCase(Locale.US);
            if (!sanitized.isBlank() && !normalized.contains(sanitized)) {
                normalized.add(sanitized);
            }
        }
        return normalized;
    }

    private String marketCacheKey(String currency, List<String> coinIds) {
        List<String> sortedCoinIds = new ArrayList<>(coinIds);
        Collections.sort(sortedCoinIds);
        return "markets:" + normalizeCurrency(currency) + ":" + String.join(",", sortedCoinIds);
    }

    private String marketItemCacheKey(String currency, String coinId) {
        return "market-item:" + normalizeCurrency(currency) + ":" + coinId;
    }

    @SuppressWarnings("unchecked")
    private void cacheMarketItems(String currency, Object response) {
        if (!(response instanceof List<?> rawList)) {
            return;
        }

        Instant expiresAt = Instant.now().plus(MARKET_CACHE_TTL);
        for (Object item : rawList) {
            if (!(item instanceof Map<?, ?> rawMap)) {
                continue;
            }
            Object id = rawMap.get("id");
            if (id == null) {
                continue;
            }
            marketItemCache.put(
                    marketItemCacheKey(currency, id.toString().toLowerCase(Locale.US)),
                    new CacheEntry((Map<String, Object>) rawMap, expiresAt)
            );
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> assembleMarketSnapshot(List<String> coinIds, String currency, boolean allowStale) {
        Instant now = Instant.now();
        List<Map<String, Object>> snapshot = new ArrayList<>();

        for (String coinId : coinIds) {
            CacheEntry cachedItem = marketItemCache.get(marketItemCacheKey(currency, coinId));
            if (cachedItem == null || (!allowStale && cachedItem.expiresAt().isBefore(now))) {
                continue;
            }
            if (cachedItem.value() instanceof Map<?, ?> rawMap) {
                snapshot.add((Map<String, Object>) rawMap);
            }
        }

        return snapshot;
    }

    private boolean isFresh(CacheEntry cacheEntry) {
        return cacheEntry != null && cacheEntry.expiresAt().isAfter(Instant.now());
    }

    private boolean isInBackoff(String endpoint) {
        Instant backoffUntil = endpointBackoffUntil.get(endpoint);
        return backoffUntil != null && backoffUntil.isAfter(Instant.now());
    }

    private void setBackoff(String endpoint, Duration duration) {
        endpointBackoffUntil.put(endpoint, Instant.now().plus(duration));
    }

    private void clearBackoff(String endpoint) {
        endpointBackoffUntil.remove(endpoint);
    }

    private record CacheEntry(Object value, Instant expiresAt) {}
}
