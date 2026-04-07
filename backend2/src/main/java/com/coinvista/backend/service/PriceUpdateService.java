package com.coinvista.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceUpdateService {

    private final SimpMessagingTemplate messagingTemplate;
    private final CoinGeckoService coinGeckoService;

    private static final List<String> TRACKED_COINS =
            List.of("bitcoin", "ethereum", "cardano", "solana", "dogecoin");

    // Broadcast every 2 minutes — CoinGecko free tier allows ~30 req/min
    // but the app makes many other calls, so 120s keeps us safely under the limit
    @Scheduled(fixedDelay = 180000, initialDelay = 45000)
    public void broadcastPrices() {
        try {
            Object prices = coinGeckoService.getCoinsPrices(TRACKED_COINS, "usd");
            if (prices instanceof List<?> list && list.isEmpty()) {
                log.warn("Skipping price broadcast because no live price snapshot is currently available.");
                return;
            }
            messagingTemplate.convertAndSend("/topic/prices", prices);
            log.info("Broadcasted live prices to /topic/prices");
        } catch (Exception e) {
            log.warn("Failed to broadcast prices: {}", e.getMessage());
        }
    }

    public void broadcastCoinPrice(String coinId) {
        try {
            Object prices = coinGeckoService.getCoinsPrices(List.of(coinId), "usd");
            if (prices instanceof List<?> list && list.isEmpty()) {
                log.warn("Skipping price broadcast for {} because no live snapshot is currently available.", coinId);
                return;
            }
            messagingTemplate.convertAndSend("/topic/coin/" + coinId, prices);
        } catch (Exception e) {
            log.warn("Failed to broadcast price for {}: {}", coinId, e.getMessage());
        }
    }
}
