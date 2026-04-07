package com.coinvista.backend.controller;

import com.coinvista.backend.dto.HoldingDto;
import com.coinvista.backend.model.User;
import com.coinvista.backend.service.HoldingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class HoldingController {

    private final HoldingService holdingService;

    @GetMapping("/api/holdings")
    public ResponseEntity<List<HoldingDto.View>> getHoldings(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(holdingService.getHoldings(user.getId()));
    }

    @PostMapping("/api/holdings")
    public ResponseEntity<HoldingDto.View> createHolding(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody HoldingDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(holdingService.createHolding(user.getId(), request));
    }

    @DeleteMapping("/api/holdings/{id}")
    public ResponseEntity<?> deleteHolding(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        holdingService.deleteHolding(id, user.getId());
        return ResponseEntity.ok(Map.of("message", "Holding removed"));
    }

    @GetMapping("/api/portfolio/summary")
    public ResponseEntity<HoldingDto.Summary> getPortfolioSummary(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(holdingService.getPortfolioSummary(user.getId()));
    }

    @GetMapping("/api/portfolio/export.csv")
    public ResponseEntity<byte[]> exportPortfolioCsv(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=coinvista-portfolio-report.csv")
                .contentType(new MediaType("text", "csv"))
                .body(holdingService.exportPortfolioCsv(user.getId()));
    }
}
