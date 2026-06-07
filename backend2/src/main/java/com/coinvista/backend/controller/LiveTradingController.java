package com.coinvista.backend.controller;

import com.coinvista.backend.model.User;
import com.coinvista.backend.service.LiveTradingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/live-trading")
@RequiredArgsConstructor
public class LiveTradingController {

    private final LiveTradingService liveTradingService;

    @GetMapping("/eligibility")
    public ResponseEntity<?> checkEligibility(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(liveTradingService.checkEligibility(user.getId()));
    }

    @PostMapping("/enable")
    public ResponseEntity<?> enableLiveTrading(
            @AuthenticationPrincipal User user,
            @RequestParam boolean enable,
            @RequestParam(required = false) String activeExchange,
            @RequestParam(required = false) String apiKey,
            @RequestParam(required = false) String apiSecret) {
        try {
            liveTradingService.enableLiveTrading(user.getId(), enable, activeExchange, apiKey, apiSecret);
            return ResponseEntity.ok(Map.of("message", "Live trading settings updated successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
