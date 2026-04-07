package com.coinvista.backend.service;

import com.coinvista.backend.model.Alert;
import com.coinvista.backend.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertMonitorService {

    private final AlertService alertService;
    private final CoinGeckoService coinGeckoService;
    private final NotificationService notificationService;

    @Scheduled(fixedDelay = 60000, initialDelay = 45000)
    public void processAlerts() {
        List<Alert> pendingAlerts = alertService.getPendingAlerts();
        if (pendingAlerts.isEmpty()) {
            return;
        }

        List<Alert> validAlerts = pendingAlerts.stream()
                .filter(this::isSchedulable)
                .toList();
        if (validAlerts.isEmpty()) {
            return;
        }

        List<String> coinIds = validAlerts.stream()
                .map(this::resolveCoinId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();
        if (coinIds.isEmpty()) {
            return;
        }

        Map<String, Map<String, Object>> marketData = coinGeckoService.getCoinsMarketData(coinIds, "usd").stream()
                .filter(item -> item.get("id") != null)
                .collect(Collectors.toMap(
                        item -> Objects.toString(item.get("id"), ""),
                        item -> item,
                        (left, right) -> left
                ));
        if (marketData.isEmpty()) {
            log.warn("Skipping alert evaluation because market data is temporarily unavailable.");
            return;
        }

        for (Alert alert : validAlerts) {
            try {
                String resolvedCoinId = resolveCoinId(alert);
                if (resolvedCoinId == null || resolvedCoinId.isBlank()) {
                    continue;
                }

                Map<String, Object> coinData = marketData.get(resolvedCoinId);
                if (coinData == null) {
                    continue;
                }

                double currentPrice = coinGeckoService.toDouble(coinData.get("current_price"));
                boolean triggered = "above".equalsIgnoreCase(alert.getDirection())
                        ? currentPrice >= alert.getTargetPrice()
                        : currentPrice <= alert.getTargetPrice();

                if (!triggered) {
                    continue;
                }

                Alert triggeredAlert = alertService.markTriggered(alert, currentPrice);
                if (!alertService.ownerExists(triggeredAlert.getUserId())) {
                    log.warn("Removing alert {} because the owning user no longer exists.", triggeredAlert.getId());
                    alertService.delete(triggeredAlert);
                    continue;
                }

                User owner = alertService.getAlertOwner(triggeredAlert.getUserId());

                if (owner.isEmailNotificationsEnabled() && notificationService.canSendEmail()) {
                    notificationService.sendPriceAlertEmail(
                            owner.getEmail(),
                            alert.getName() == null || alert.getName().isBlank() ? alert.getSymbol() : alert.getName(),
                            alert.getSymbol(),
                            alert.getTargetPrice(),
                            currentPrice,
                            alert.getDirection()
                    );
                    triggeredAlert.setNotificationSentAt(Instant.now());
                    alertService.save(triggeredAlert);
                }
            } catch (Exception exception) {
                log.warn("Failed to process alert {}: {}", alert.getId(), exception.getMessage());
            }
        }
    }

    private String resolveCoinId(Alert alert) {
        if (alert.getCoinId() != null && !alert.getCoinId().isBlank()) {
            return alert.getCoinId();
        }
        String symbol = alert.getSymbol() == null ? "" : alert.getSymbol().toLowerCase(Locale.US);
        return switch (symbol) {
            case "btc" -> "bitcoin";
            case "eth" -> "ethereum";
            case "sol" -> "solana";
            case "ada" -> "cardano";
            case "doge" -> "dogecoin";
            default -> symbol;
        };
    }

    private boolean isSchedulable(Alert alert) {
        boolean malformed = alert == null
                || alert.getId() == null
                || alert.getUserId() == null
                || alert.getUserId().isBlank()
                || alert.getTargetPrice() == null
                || alert.getDirection() == null
                || alert.getDirection().isBlank()
                || !alertService.ownerExists(alert.getUserId())
                || resolveCoinId(alert) == null
                || resolveCoinId(alert).isBlank();

        if (malformed && alert != null) {
            log.warn("Removing malformed alert {} from the scheduler queue.", alert.getId());
            alertService.delete(alert);
        }

        return !malformed;
    }
}
