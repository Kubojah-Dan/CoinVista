package com.coinvista.backend.service;

import com.coinvista.backend.model.*;
import com.coinvista.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SocialService {
    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final PaperPositionRepository paperPositionRepository;
    private final ClosedTradeRepository closedTradeRepository;
    private final CoinGeckoService coinGeckoService;

    // Leaderboard Entry
    @lombok.Data
    public static class LeaderboardEntry {
        private String userId;
        private String name;
        private String avatarUrl;
        private double totalValue;
        private double roi;
        private double winRate;
        private int totalTrades;
        private int activePositionsCount;
    }

    // Public Profile Details
    @lombok.Data
    public static class PublicProfile {
        private String userId;
        private String name;
        private String avatarUrl;
        private double roi;
        private double winRate;
        private int totalTrades;
        private int followersCount;
        private int followingCount;
        private boolean isFollowing;
        private boolean copyTradingEnabled;
        private double copyAllocationPercent;
        private List<PaperPosition> activePositions;
        private List<ClosedTrade> recentTrades;
    }

    public List<LeaderboardEntry> getLeaderboard() {
        List<User> publicUsers = userRepository.findAll().stream()
                .filter(u -> !u.isPrivacyModeEnabled())
                .toList();

        List<PaperPosition> allPositions = paperPositionRepository.findAll();
        Map<String, List<PaperPosition>> positionsByUser = allPositions.stream()
                .collect(Collectors.groupingBy(PaperPosition::getUserId));

        List<ClosedTrade> allClosedTrades = closedTradeRepository.findAll();
        Map<String, List<ClosedTrade>> closedTradesByUser = allClosedTrades.stream()
                .collect(Collectors.groupingBy(ClosedTrade::getUserId));

        List<String> coinIds = allPositions.stream()
                .map(PaperPosition::getCoinId)
                .distinct()
                .toList();

        Map<String, Double> prices = new HashMap<>();
        if (!coinIds.isEmpty()) {
            try {
                List<Map<String, Object>> marketData = coinGeckoService.getCoinsMarketData(coinIds, "usd");
                for (Map<String, Object> data : marketData) {
                    if (data.get("id") != null && data.get("current_price") != null) {
                        prices.put(data.get("id").toString(), coinGeckoService.toDouble(data.get("current_price")));
                    }
                }
            } catch (Exception e) {
                // Fallback to average entry price
            }
        }

        List<LeaderboardEntry> entries = new ArrayList<>();
        for (User user : publicUsers) {
            List<PaperPosition> userPositions = positionsByUser.getOrDefault(user.getId(), List.of());
            List<ClosedTrade> userTrades = closedTradesByUser.getOrDefault(user.getId(), List.of());

            double marketValue = 0.0;
            for (PaperPosition pos : userPositions) {
                double currentPrice = prices.getOrDefault(pos.getCoinId(), pos.getEntryPrice());
                double posValue;
                if ("short".equalsIgnoreCase(pos.getSide())) {
                    double posUnrealizedPnl = (pos.getEntryPrice() - currentPrice) * pos.getSize();
                    posValue = (pos.getEntryPrice() * pos.getSize()) + posUnrealizedPnl;
                } else {
                    posValue = currentPrice * pos.getSize();
                }
                marketValue += posValue;
            }

            double totalValue = user.getPaperCashBalance() + marketValue;
            double starting = user.getPaperStartingBalance() > 0 ? user.getPaperStartingBalance() : 10000.0;
            double roi = ((totalValue - starting) / starting) * 100.0;

            int totalTradesCount = userTrades.size();
            long winTradesCount = userTrades.stream().filter(t -> t.getPnl() > 0).count();
            double winRate = totalTradesCount > 0 ? ((double) winTradesCount / totalTradesCount) * 100.0 : 0.0;

            LeaderboardEntry entry = new LeaderboardEntry();
            entry.setUserId(user.getId());
            entry.setName(user.getName());
            entry.setAvatarUrl(user.getAvatarUrl());
            entry.setTotalValue(round(totalValue));
            entry.setRoi(round(roi));
            entry.setWinRate(round(winRate));
            entry.setTotalTrades(totalTradesCount);
            entry.setActivePositionsCount(userPositions.size());
            entries.add(entry);
        }

        entries.sort(Comparator.comparingDouble(LeaderboardEntry::getRoi).reversed());
        return entries;
    }

    public PublicProfile getPublicProfile(String targetUserId, String currentUserId) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<PaperPosition> activePositions = paperPositionRepository.findByUserId(targetUserId);
        List<ClosedTrade> recentTrades = closedTradeRepository.findByUserIdOrderByClosedAtDesc(targetUserId);
        if (recentTrades.size() > 10) {
            recentTrades = recentTrades.subList(0, 10);
        }

        List<Follow> followers = followRepository.findByFollowingId(targetUserId);
        List<Follow> following = followRepository.findByFollowerId(targetUserId);

        Optional<Follow> followRelation = followRepository.findByFollowerIdAndFollowingId(currentUserId, targetUserId);

        // Compute performance
        double marketValue = 0.0;
        List<String> coinIds = activePositions.stream().map(PaperPosition::getCoinId).distinct().toList();
        Map<String, Double> prices = new HashMap<>();
        if (!coinIds.isEmpty()) {
            try {
                List<Map<String, Object>> marketData = coinGeckoService.getCoinsMarketData(coinIds, "usd");
                for (Map<String, Object> data : marketData) {
                    if (data.get("id") != null && data.get("current_price") != null) {
                        prices.put(data.get("id").toString(), coinGeckoService.toDouble(data.get("current_price")));
                    }
                }
            } catch (Exception e) {
                // Fallback
            }
        }

        for (PaperPosition pos : activePositions) {
            double currentPrice = prices.getOrDefault(pos.getCoinId(), pos.getEntryPrice());
            double posValue;
            if ("short".equalsIgnoreCase(pos.getSide())) {
                double posUnrealizedPnl = (pos.getEntryPrice() - currentPrice) * pos.getSize();
                posValue = (pos.getEntryPrice() * pos.getSize()) + posUnrealizedPnl;
            } else {
                posValue = currentPrice * pos.getSize();
            }
            marketValue += posValue;
        }

        double totalValue = targetUser.getPaperCashBalance() + marketValue;
        double starting = targetUser.getPaperStartingBalance() > 0 ? targetUser.getPaperStartingBalance() : 10000.0;
        double roi = ((totalValue - starting) / starting) * 100.0;

        List<ClosedTrade> allClosedTrades = closedTradeRepository.findByUserIdOrderByClosedAtDesc(targetUserId);
        int totalTradesCount = allClosedTrades.size();
        long winTradesCount = allClosedTrades.stream().filter(t -> t.getPnl() > 0).count();
        double winRate = totalTradesCount > 0 ? ((double) winTradesCount / totalTradesCount) * 100.0 : 0.0;

        PublicProfile profile = new PublicProfile();
        profile.setUserId(targetUser.getId());
        profile.setName(targetUser.getName());
        profile.setAvatarUrl(targetUser.getAvatarUrl());
        profile.setRoi(round(roi));
        profile.setWinRate(round(winRate));
        profile.setTotalTrades(totalTradesCount);
        profile.setFollowersCount(followers.size());
        profile.setFollowingCount(following.size());
        profile.setFollowing(followRelation.isPresent());
        profile.setCopyTradingEnabled(followRelation.map(Follow::isCopyTradingEnabled).orElse(false));
        profile.setCopyAllocationPercent(followRelation.map(Follow::getCopyAllocationPercent).orElse(10.0));
        profile.setActivePositions(activePositions);
        profile.setRecentTrades(recentTrades);

        return profile;
    }

    public Follow followUser(String currentUserId, String targetUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new IllegalArgumentException("You cannot follow yourself");
        }
        userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User to follow not found"));

        return followRepository.findByFollowerIdAndFollowingId(currentUserId, targetUserId)
                .orElseGet(() -> {
                    Follow follow = new Follow();
                    follow.setFollowerId(currentUserId);
                    follow.setFollowingId(targetUserId);
                    follow.setCopyTradingEnabled(false);
                    follow.setCopyAllocationPercent(10.0);
                    follow.setCreatedAt(Instant.now());
                    return followRepository.save(follow);
                });
    }

    public void unfollowUser(String currentUserId, String targetUserId) {
        followRepository.findByFollowerIdAndFollowingId(currentUserId, targetUserId)
                .ifPresent(followRepository::delete);
    }

    public Follow updateCopyConfig(String currentUserId, String followingId, boolean enabled, double percent) {
        Follow follow = followRepository.findByFollowerIdAndFollowingId(currentUserId, followingId)
                .orElseThrow(() -> new IllegalArgumentException("You are not following this user"));

        follow.setCopyTradingEnabled(enabled);
        follow.setCopyAllocationPercent(Math.max(1.0, Math.min(100.0, percent)));
        return followRepository.save(follow);
    }

    public List<Follow> getFollowing(String currentUserId) {
        return followRepository.findByFollowerId(currentUserId);
    }

    public List<Follow> getFollowers(String currentUserId) {
        return followRepository.findByFollowingId(currentUserId);
    }

    private double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
