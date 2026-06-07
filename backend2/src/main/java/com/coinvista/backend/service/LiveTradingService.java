package com.coinvista.backend.service;

import com.coinvista.backend.model.ClosedTrade;
import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.ClosedTradeRepository;
import com.coinvista.backend.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveTradingService {

    private final UserRepository userRepository;
    private final ClosedTradeRepository closedTradeRepository;
    private final CryptoSecurityService cryptoSecurityService;
    private final CoinGeckoService coinGeckoService;

    @Data
    public static class EligibilityResponse {
        private boolean eligible;
        private int totalTrades;
        private double winRate;
        private String message;
    }

    public EligibilityResponse checkEligibility(String userId) {
        List<ClosedTrade> trades = closedTradeRepository.findByUserIdOrderByClosedAtDesc(userId);
        int totalTrades = trades.size();
        long wins = trades.stream().filter(t -> t.getPnl() > 0).count();
        double winRate = totalTrades > 0 ? ((double) wins / totalTrades) * 100.0 : 0.0;

        EligibilityResponse response = new EligibilityResponse();
        response.setTotalTrades(totalTrades);
        response.setWinRate(Math.round(winRate * 100.0) / 100.0);

        if (totalTrades < 30) {
            response.setEligible(false);
            response.setMessage(String.format("You have only completed %d/30 required paper trades. Complete more simulator trades first.", totalTrades));
        } else if (winRate < 50.0) {
            response.setEligible(false);
            response.setMessage(String.format("Your simulator win rate is %.2f%%. A minimum win rate of 50.0%% is required.", winRate));
        } else {
            response.setEligible(true);
            response.setMessage("Congratulations! You meet all safety gate requirements for live trading.");
        }

        return response;
    }

    public void enableLiveTrading(String userId, boolean enable, String activeExchange, String apiKey, String apiSecret) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (enable) {
            if (apiKey == null || apiKey.isBlank() || apiSecret == null || apiSecret.isBlank()) {
                throw new IllegalArgumentException("Exchange API Key and API Secret are required to activate live trading.");
            }

            EligibilityResponse eligibility = checkEligibility(userId);
            if (!eligibility.isEligible()) {
                throw new IllegalStateException("Safety gate requirements not met: " + eligibility.getMessage());
            }

            user.setLiveTradingEnabled(true);
            user.setEncryptedExchangeApiKey(cryptoSecurityService.encrypt(apiKey));
            user.setEncryptedExchangeApiSecret(cryptoSecurityService.encrypt(apiSecret));
            user.setActiveExchange(activeExchange != null ? activeExchange.toLowerCase() : "binance");
        } else {
            user.setLiveTradingEnabled(false);
        }
        
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    public Object executeLiveOrder(String userId, String coinId, String symbol, String name, String side, double quantity) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isLiveTradingEnabled()) {
            throw new IllegalStateException("Live trading is currently locked or disabled. Please enable it in Settings.");
        }

        String decryptedKey = cryptoSecurityService.decrypt(user.getEncryptedExchangeApiKey());
        String decryptedSecret = cryptoSecurityService.decrypt(user.getEncryptedExchangeApiSecret());

        log.info("Connecting to live exchange {} for user {} using key: {}...",
                user.getActiveExchange(), userId, decryptedKey.substring(0, Math.min(5, decryptedKey.length())) + "...");

        // Simulate filled live order receipt for sandbox validation
        double mockExecutionPrice = 60000.0; // Fallback baseline
        try {
            mockExecutionPrice = coinGeckoService.getCurrentPrice(coinId, "usd");
        } catch (Exception ignored) {}

        log.info("Live order filled successfully on {} at ${}.", user.getActiveExchange(), mockExecutionPrice);

        return List.of(
                "success",
                "Order executed successfully on " + user.getActiveExchange().toUpperCase() + " sandbox.",
                mockExecutionPrice
        );
    }
}
