package com.coinvista.backend.controller;

import com.coinvista.backend.dto.AlertDto;
import com.coinvista.backend.model.Alert;
import com.coinvista.backend.model.User;
import com.coinvista.backend.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public ResponseEntity<List<Alert>> getAlerts(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(alertService.getAlerts(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> createAlert(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AlertDto.CreateRequest request) {
        Alert alert = alertService.createAlert(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(alert);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAlert(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        try {
            alertService.deleteAlert(id, user.getId());
            return ResponseEntity.ok(Map.of("message", "Alert removed"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
