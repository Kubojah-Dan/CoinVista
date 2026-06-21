package com.coinvista.backend.controller;

import com.coinvista.backend.dto.PaperTradingDto;
import com.coinvista.backend.model.User;
import com.coinvista.backend.model.TradeAnalysis;
import com.coinvista.backend.model.InboxMessage;
import com.coinvista.backend.repository.ClosedTradeRepository;
import com.coinvista.backend.repository.TradeAnalysisRepository;
import com.coinvista.backend.repository.InboxMessageRepository;
import com.coinvista.backend.service.PaperTradingService;
import com.coinvista.backend.service.WeeklyReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/paper-trading")
@RequiredArgsConstructor
public class PaperTradingController {

    private final PaperTradingService paperTradingService;
    private final ClosedTradeRepository closedTradeRepository;
    private final TradeAnalysisRepository tradeAnalysisRepository;
    private final InboxMessageRepository inboxMessageRepository;
    private final WeeklyReviewService weeklyReviewService;

    @GetMapping("/summary")
    public ResponseEntity<PaperTradingDto.Summary> getSummary(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(paperTradingService.getSummary(user.getId()));
    }

    @PostMapping("/trades")
    public ResponseEntity<PaperTradingDto.Summary> placeTrade(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PaperTradingDto.TradeRequest request) {
        return ResponseEntity.ok(paperTradingService.placeTrade(user.getId(), request));
    }

    @PostMapping("/reset")
    public ResponseEntity<PaperTradingDto.Summary> reset(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(paperTradingService.reset(user.getId()));
    }

    @PostMapping("/toggle")
    public ResponseEntity<PaperTradingDto.Summary> toggleAgentExecution(
            @AuthenticationPrincipal User user,
            @RequestParam boolean paperTradingEnabled,
            @RequestParam boolean liveTradingEnabled) {
        paperTradingService.updateAgentExecutionToggle(user.getId(), paperTradingEnabled, liveTradingEnabled);
        return ResponseEntity.ok(paperTradingService.getSummary(user.getId()));
    }

    @GetMapping("/trades/{tradeId}/analysis")
    public ResponseEntity<?> getTradeAnalysis(
            @AuthenticationPrincipal User user,
            @PathVariable String tradeId) {
        return closedTradeRepository.findById(tradeId)
                .map(trade -> {
                    if (!trade.getUserId().equals(user.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    return tradeAnalysisRepository.findByTradeId(tradeId)
                            .map(ResponseEntity::ok)
                            .orElse(ResponseEntity.notFound().build());
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/inbox")
    public ResponseEntity<List<InboxMessage>> getInbox(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(inboxMessageRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @PatchMapping("/inbox/{id}/read")
    public ResponseEntity<?> markMessageAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        return inboxMessageRepository.findById(id)
                .map(message -> {
                    if (!message.getUserId().equals(user.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    message.setRead(true);
                    inboxMessageRepository.save(message);
                    return ResponseEntity.ok(Map.of("message", "Message marked as read"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/weekly-review/trigger")
    public ResponseEntity<?> triggerWeeklyReview(@AuthenticationPrincipal User user) {
        try {
            weeklyReviewService.generateWeeklyReviewForUser(user);
            return ResponseEntity.ok(Map.of("message", "Weekly review triggered successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to generate weekly review: " + e.getMessage()));
        }
    }
}
