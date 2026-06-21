package com.coinvista.backend.controller;

import com.coinvista.backend.model.User;
import com.coinvista.backend.model.UserXP;
import com.coinvista.backend.service.GamificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gamification")
@RequiredArgsConstructor
public class GamificationController {

    private final GamificationService gamificationService;

    @GetMapping("/xp")
    public ResponseEntity<UserXP> getMyXP(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(gamificationService.getOrCreateXP(user.getId()));
    }
}
