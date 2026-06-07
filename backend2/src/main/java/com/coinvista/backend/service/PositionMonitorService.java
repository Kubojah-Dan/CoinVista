package com.coinvista.backend.service;

import com.coinvista.backend.model.PaperPosition;
import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PositionMonitorService {

    private final PaperTradingService paperTradingService;
    private final CoinGeckoService coinGeckoService;
    private final UserRepository userRepository;

    @Scheduled(fixedDelay = 60000, initialDelay = 30000)
    public void monitorPositions() {
        List<PaperPosition> openPositions = paperTradingService.getAllOpenPositions();
        if (openPositions.isEmpty()) {
            return;
        }

        List<String> coinIds = openPositions.stream()
                .map(PaperPosition::getCoinId)
                .distinct()
                .toList();

        Map<String, Map<String, Object>> marketData = coinGeckoService.getCoinsMarketData(coinIds, "usd").stream()
                .filter(item -> item.get("id") != null)
                .collect(Collectors.toMap(
                        item -> item.get("id").toString(),
                        item -> item,
                        (l, r) -> l
                    ));

        if (marketData.isEmpty()) {
            log.warn("Skipping position monitor execution: market data is temporarily unavailable.");
            return;
        }

        for (PaperPosition pos : openPositions) {
            try {
                Map<String, Object> data = marketData.get(pos.getCoinId());
                if (data == null) {
                    continue;
                }

                double currentPrice = coinGeckoService.toDouble(data.get("current_price"));
                boolean triggerSL = false;
                boolean triggerTP = false;

                if ("short".equalsIgnoreCase(pos.getSide())) {
                    if (pos.getStopLoss() != null && pos.getStopLoss() > 0 && currentPrice >= pos.getStopLoss()) {
                        triggerSL = true;
                    }
                    if (pos.getTakeProfit() != null && pos.getTakeProfit() > 0 && currentPrice <= pos.getTakeProfit()) {
                        triggerTP = true;
                    }
                } else {
                    if (pos.getStopLoss() != null && pos.getStopLoss() > 0 && currentPrice <= pos.getStopLoss()) {
                        triggerSL = true;
                    }
                    if (pos.getTakeProfit() != null && pos.getTakeProfit() > 0 && currentPrice >= pos.getTakeProfit()) {
                        triggerTP = true;
                    }
                }

                if (triggerSL || triggerTP) {
                    User owner = userRepository.findById(pos.getUserId()).orElse(null);
                    if (owner != null) {
                        String reason = triggerSL ? "stop_loss" : "take_profit";
                        log.info("Triggered {} exit for position {} of user {} at price ${}.",
                                reason, pos.getId(), pos.getUserId(), currentPrice);
                        paperTradingService.closeOrReducePosition(owner, pos, pos.getSize(), currentPrice, reason);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to process position monitoring for pos {}: {}", pos.getId(), e.getMessage());
            }
        }
    }
}
