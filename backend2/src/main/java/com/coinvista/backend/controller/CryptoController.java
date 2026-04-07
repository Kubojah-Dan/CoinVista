package com.coinvista.backend.controller;

import com.coinvista.backend.dto.AlertDto;
import com.coinvista.backend.model.Alert;
import com.coinvista.backend.model.User;
import com.coinvista.backend.service.AlertService;
import com.coinvista.backend.service.CoinGeckoService;
import com.coinvista.backend.service.WatchlistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/crypto")
@RequiredArgsConstructor
public class CryptoController {

    private final CoinGeckoService coinGeckoService;
    private final WatchlistService watchlistService;
    private final AlertService alertService;

    // ── Public endpoints ──────────────────────────────────────────────────────

    @GetMapping("/coins/top")
    public ResponseEntity<?> getTopCoins(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int perPage,
            @RequestParam(defaultValue = "usd") String currency) {
        try {
            Object coins = coinGeckoService.getTopCoins(currency, page, perPage);
            return ResponseEntity.ok(Map.of("coins", coins, "currency", currency));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch cryptocurrencies"));
        }
    }

    @GetMapping("/coins/{id}")
    public ResponseEntity<?> getCoinDetails(@PathVariable String id) {
        try {
            Object coin = coinGeckoService.getCoinDetails(id);
            return ResponseEntity.ok(Map.of("coin", coin));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch coin details"));
        }
    }

    @GetMapping("/coins/{id}/chart")
    public ResponseEntity<?> getCoinChart(
            @PathVariable String id,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "usd") String currency) {
        try {
            Object chartData = coinGeckoService.getCoinChart(id, currency, days);
            return ResponseEntity.ok(Map.of("chartData", chartData, "currency", currency));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch chart data"));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchCoins(@RequestParam String query) {
        try {
            Object results = coinGeckoService.searchCoins(query);
            return ResponseEntity.ok(Map.of("results", results));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to search coins"));
        }
    }

    @GetMapping("/trending")
    public ResponseEntity<?> getTrendingCoins() {
        try {
            Object trending = coinGeckoService.getTrendingCoins();
            return ResponseEntity.ok(Map.of("trending", extractTrendingCoins(trending)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch trending coins"));
        }
    }

    @GetMapping("/global")
    public ResponseEntity<?> getGlobalData(@RequestParam(defaultValue = "usd") String currency) {
        try {
            Object globalData = coinGeckoService.getGlobalData();
            return ResponseEntity.ok(Map.of("globalData", globalData));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch global market data"));
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractTrendingCoins(Object trending) {
        if (trending instanceof Map<?, ?> map && map.get("coins") instanceof List<?> coins) {
            return coins.stream()
                    .filter(Map.class::isInstance)
                    .map(item -> (Map<String, Object>) item)
                    .toList();
        }

        if (trending instanceof List<?> coins) {
            return coins.stream()
                    .filter(Map.class::isInstance)
                    .map(item -> (Map<String, Object>) item)
                    .toList();
        }

        return List.of();
    }

    // ── Watchlist (protected) ─────────────────────────────────────────────────

    @GetMapping("/watchlist")
    public ResponseEntity<?> getWatchlist(@AuthenticationPrincipal User user) {
        try {
            Object watchlist = watchlistService.getWatchlist(user.getId());
            return ResponseEntity.ok(Map.of("watchlist", watchlist));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch watchlist"));
        }
    }

    @PostMapping("/watchlist")
    public ResponseEntity<?> addToWatchlist(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        try {
            String coinId = body.get("coinId");
            if (coinId == null || coinId.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Coin ID is required"));
            }
            Object watchlist = watchlistService.addToWatchlist(user.getId(), coinId);
            return ResponseEntity.ok(Map.of("message", "Added to watchlist", "watchlist", watchlist));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/watchlist/{coinId}")
    public ResponseEntity<?> removeFromWatchlist(
            @AuthenticationPrincipal User user,
            @PathVariable String coinId) {
        try {
            Object watchlist = watchlistService.removeFromWatchlist(user.getId(), coinId);
            return ResponseEntity.ok(Map.of("message", "Removed from watchlist", "watchlist", watchlist));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to remove from watchlist"));
        }
    }

    // ── Alerts (protected) ────────────────────────────────────────────────────

    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts(@AuthenticationPrincipal User user) {
        try {
            List<Alert> alerts = alertService.getAlerts(user.getId());
            return ResponseEntity.ok(Map.of("alerts", alerts));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch alerts"));
        }
    }

    @PostMapping("/alerts")
    public ResponseEntity<?> createAlert(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AlertDto.CreateRequest request) {
        try {
            Alert alert = alertService.createAlert(user.getId(), request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Alert created successfully", "alert", alert));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create alert"));
        }
    }

    @DeleteMapping("/alerts/{alertId}")
    public ResponseEntity<?> deleteAlert(
            @AuthenticationPrincipal User user,
            @PathVariable String alertId) {
        try {
            alertService.deleteAlert(alertId, user.getId());
            return ResponseEntity.ok(Map.of("message", "Alert deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
