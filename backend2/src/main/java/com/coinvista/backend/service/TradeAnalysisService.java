package com.coinvista.backend.service;

import com.coinvista.backend.model.ClosedTrade;
import com.coinvista.backend.model.TradeAnalysis;
import com.coinvista.backend.repository.TradeAnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeAnalysisService {

    private final TradeAnalysisRepository tradeAnalysisRepository;

    @Value("${app.agent.url}")
    private String agentUrl;

    /**
     * Run trade analysis asynchronously via Python AI agent service
     */
    @Async
    public void analyzeTradeAsync(ClosedTrade trade) {
        log.info("Triggering async AI trade analysis for trade: {}", trade.getId());

        try {
            WebClient webClient = WebClient.builder()
                    .baseUrl(agentUrl)
                    .build();

            Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("tradeId", trade.getId() != null ? trade.getId() : "");
            payload.put("coinId", trade.getCoinId() != null ? trade.getCoinId() : "");
            payload.put("symbol", trade.getSymbol() != null ? trade.getSymbol() : "");
            payload.put("name", trade.getName() != null ? trade.getName() : "");
            payload.put("side", trade.getSide() != null ? trade.getSide() : "long");
            payload.put("entryPrice", trade.getEntryPrice() != null ? trade.getEntryPrice() : 0.0);
            payload.put("exitPrice", trade.getExitPrice() != null ? trade.getExitPrice() : 0.0);
            payload.put("size", trade.getSize() != null ? trade.getSize() : 0.0);
            payload.put("stopLoss", trade.getStopLoss() != null ? trade.getStopLoss() : 0.0);
            payload.put("takeProfit", trade.getTakeProfit() != null ? trade.getTakeProfit() : 0.0);
            payload.put("pnl", trade.getPnl() != null ? trade.getPnl() : 0.0);
            payload.put("pnlPercent", trade.getPnlPercent() != null ? trade.getPnlPercent() : 0.0);
            payload.put("strategy", trade.getStrategy() != null ? trade.getStrategy() : "Manual");
            payload.put("closeReason", trade.getCloseReason() != null ? trade.getCloseReason() : "manual");
            payload.put("preTradeThesis", trade.getPreTradeThesis() != null ? trade.getPreTradeThesis() : "");
            payload.put("preTradeInvalidation", trade.getPreTradeInvalidation() != null ? trade.getPreTradeInvalidation() : "");
            payload.put("preTradeRnR", trade.getPreTradeRnR() != null ? trade.getPreTradeRnR() : 0.0);

            webClient.post()
                    .uri("/api/agent/analyze-trade")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .doOnSuccess(response -> {
                        if (response != null) {
                            try {
                                TradeAnalysis analysis = new TradeAnalysis();
                                analysis.setTradeId(trade.getId());
                                analysis.setStrategy((String) response.get("strategy"));
                                analysis.setExecutionScore((Integer) response.get("executionScore"));
                                analysis.setEmotions((List<String>) response.get("emotions"));
                                analysis.setAiReport((String) response.get("aiReport"));
                                analysis.setCreatedAt(Instant.now());
                                
                                tradeAnalysisRepository.save(analysis);
                                log.info("AI Trade analysis successfully saved for trade: {}", trade.getId());
                            } catch (Exception ex) {
                                log.error("Error parsing/saving trade analysis response", ex);
                            }
                        }
                    })
                    .doOnError(err -> log.error("Failed to fetch trade analysis from AI agent: {}", err.getMessage()))
                    .subscribe();

        } catch (Exception e) {
            log.error("Failed to initiate trade analysis: {}", e.getMessage());
        }
    }
}
