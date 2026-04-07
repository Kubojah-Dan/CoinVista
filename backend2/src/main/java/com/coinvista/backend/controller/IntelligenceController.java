package com.coinvista.backend.controller;

import com.coinvista.backend.dto.IntelligenceDto;
import com.coinvista.backend.service.MarketIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/intelligence")
@RequiredArgsConstructor
public class IntelligenceController {

    private final MarketIntelligenceService marketIntelligenceService;

    @GetMapping("/{coinId}")
    public ResponseEntity<IntelligenceDto.Response> getInsights(@PathVariable String coinId) {
        return ResponseEntity.ok(marketIntelligenceService.buildInsights(coinId));
    }
}
