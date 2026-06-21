package com.coinvista.backend.service;

import com.coinvista.backend.model.ClosedTrade;
import com.coinvista.backend.model.InboxMessage;
import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.ClosedTradeRepository;
import com.coinvista.backend.repository.InboxMessageRepository;
import com.coinvista.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeeklyReviewService {

    private final UserRepository userRepository;
    private final ClosedTradeRepository closedTradeRepository;
    private final InboxMessageRepository inboxMessageRepository;

    @Value("${app.agent.url}")
    private String agentUrl;

    /**
     * Cron schedule: 8:00 AM UTC every Monday
     */
    @Scheduled(cron = "0 0 8 ? * MON")
    public void generateWeeklyReviews() {
        log.info("Starting scheduled weekly reviews generation...");
        List<User> users = userRepository.findAll();
        for (User user : users) {
            try {
                generateWeeklyReviewForUser(user);
            } catch (Exception e) {
                log.error("Failed to generate weekly review for user: {}", user.getEmail(), e);
            }
        }
    }

    /**
     * Generate weekly review for a single user and push to in-app inbox
     */
    public void generateWeeklyReviewForUser(User user) {
        Instant oneWeekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        List<ClosedTrade> weeklyTrades = closedTradeRepository
                .findByUserIdAndClosedAtAfterOrderByClosedAtDesc(user.getId(), oneWeekAgo);

        if (weeklyTrades.isEmpty()) {
            log.info("No trades to review for user: {} in the past week.", user.getEmail());
            
            // Push a default summary encouragement to in-app inbox
            InboxMessage msg = new InboxMessage();
            msg.setUserId(user.getId());
            msg.setTitle("Weekly Performance Review");
            msg.setContent("### Weekly Trading Review\n\nNo simulator trades were completed this past week. "
                    + "Try placing some trades in the simulator page to receive quantitative feedback and Llama AI analytics next Monday!");
            msg.setRead(false);
            msg.setCreatedAt(Instant.now());
            inboxMessageRepository.save(msg);
            return;
        }

        log.info("Found {} trades for user: {}. Initiating AI weekly review...", weeklyTrades.size(), user.getEmail());

        List<Map<String, Object>> serializedTrades = new ArrayList<>();
        for (ClosedTrade trade : weeklyTrades) {
            serializedTrades.add(Map.of(
                    "symbol", trade.getSymbol(),
                    "side", trade.getSide(),
                    "entryPrice", trade.getEntryPrice(),
                    "exitPrice", trade.getExitPrice(),
                    "size", trade.getSize(),
                    "pnl", trade.getPnl(),
                    "pnlPercent", trade.getPnlPercent(),
                    "strategy", trade.getStrategy() != null ? trade.getStrategy() : "Manual",
                    "closeReason", trade.getCloseReason() != null ? trade.getCloseReason() : "manual",
                    "preTradeThesis", trade.getPreTradeThesis() != null ? trade.getPreTradeThesis() : ""
            ));
        }

        try {
            WebClient webClient = WebClient.builder()
                    .baseUrl(agentUrl)
                    .build();

            Map<String, Object> payload = Map.of(
                    "trades", serializedTrades,
                    "userEmail", user.getEmail()
            );

            Map response = webClient.post()
                    .uri("/api/agent/generate-weekly-review")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("report")) {
                String reportMarkdown = (String) response.get("report");

                InboxMessage message = new InboxMessage();
                message.setUserId(user.getId());
                message.setTitle("Weekly Performance Review - " + Instant.now().toString().substring(0, 10));
                message.setContent(reportMarkdown);
                message.setRead(false);
                message.setCreatedAt(Instant.now());

                inboxMessageRepository.save(message);
                log.info("Pushed weekly review report to user: {} inbox", user.getEmail());
            } else {
                log.error("Failed to generate weekly review: empty response from agent");
            }
        } catch (Exception e) {
            log.error("Failed to generate weekly review for user {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
