package com.coinvista.backend.controller;

import com.coinvista.backend.model.Strategy;
import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.StrategyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/strategies")
@RequiredArgsConstructor
public class StrategyController {

    private final StrategyRepository strategyRepository;

    @GetMapping
    public ResponseEntity<List<Strategy>> getMyStrategies(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(strategyRepository.findByUserId(user.getId()));
    }

    @PostMapping
    public ResponseEntity<Strategy> createStrategy(
            @AuthenticationPrincipal User user,
            @RequestBody Strategy strategy) {
        strategy.setUserId(user.getId());
        strategy.setCreatedAt(Instant.now());
        strategy.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(strategyRepository.save(strategy));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Strategy> updateStrategy(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @RequestBody Strategy updated) {
        return strategyRepository.findById(id)
                .map(existing -> {
                    if (!existing.getUserId().equals(user.getId())) {
                        return ResponseEntity.status(403).<Strategy>build();
                    }
                    existing.setName(updated.getName());
                    existing.setDescription(updated.getDescription());
                    existing.setStrategyJson(updated.getStrategyJson());
                    existing.setPublic(updated.isPublic());
                    existing.setUpdatedAt(Instant.now());
                    return ResponseEntity.ok(strategyRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStrategy(@AuthenticationPrincipal User user, @PathVariable String id) {
        return strategyRepository.findById(id)
                .map(existing -> {
                    if (!existing.getUserId().equals(user.getId())) {
                        return ResponseEntity.status(403).build();
                    }
                    strategyRepository.delete(existing);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
