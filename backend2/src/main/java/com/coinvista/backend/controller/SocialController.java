package com.coinvista.backend.controller;

import com.coinvista.backend.model.Follow;
import com.coinvista.backend.model.User;
import com.coinvista.backend.service.SocialService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/social")
@RequiredArgsConstructor
public class SocialController {

    private final SocialService socialService;

    @GetMapping("/leaderboard")
    public ResponseEntity<List<SocialService.LeaderboardEntry>> getLeaderboard() {
        return ResponseEntity.ok(socialService.getLeaderboard());
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<SocialService.PublicProfile> getPublicProfile(
            @AuthenticationPrincipal User user,
            @PathVariable String userId) {
        return ResponseEntity.ok(socialService.getPublicProfile(userId, user.getId()));
    }

    @PostMapping("/follow/{userId}")
    public ResponseEntity<Follow> followUser(
            @AuthenticationPrincipal User user,
            @PathVariable String userId) {
        return ResponseEntity.ok(socialService.followUser(user.getId(), userId));
    }

    @PostMapping("/unfollow/{userId}")
    public ResponseEntity<?> unfollowUser(
            @AuthenticationPrincipal User user,
            @PathVariable String userId) {
        socialService.unfollowUser(user.getId(), userId);
        return ResponseEntity.ok(Map.of("message", "Successfully unfollowed user"));
    }

    @Data
    public static class CopyConfigRequest {
        private String followingId;
        private boolean copyTradingEnabled;
        private double copyAllocationPercent;
    }

    @PostMapping("/copy-config")
    public ResponseEntity<Follow> updateCopyConfig(
            @AuthenticationPrincipal User user,
            @RequestBody CopyConfigRequest request) {
        return ResponseEntity.ok(socialService.updateCopyConfig(
                user.getId(),
                request.getFollowingId(),
                request.isCopyTradingEnabled(),
                request.getCopyAllocationPercent()
        ));
    }

    @GetMapping("/following")
    public ResponseEntity<List<Follow>> getFollowing(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(socialService.getFollowing(user.getId()));
    }

    @GetMapping("/followers")
    public ResponseEntity<List<Follow>> getFollowers(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(socialService.getFollowers(user.getId()));
    }
}
