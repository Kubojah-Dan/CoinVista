package com.coinvista.backend.controller;

import com.coinvista.backend.dto.PaperTradingDto;
import com.coinvista.backend.model.User;
import com.coinvista.backend.service.PaperTradingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/paper-trading")
@RequiredArgsConstructor
public class PaperTradingController {

    private final PaperTradingService paperTradingService;

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
}
