package com.coinvista.backend.service;

import com.coinvista.backend.model.UserXP;
import com.coinvista.backend.model.ClosedTrade;
import com.coinvista.backend.repository.UserXPRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class GamificationService {

    private final UserXPRepository userXPRepository;

    public UserXP getOrCreateXP(String userId) {
        return userXPRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserXP xp = new UserXP();
                    xp.setUserId(userId);
                    xp.setXp(0);
                    xp.setLevel(1);
                    xp.setBadges(new ArrayList<>());
                    return userXPRepository.save(xp);
                });
    }

    public void awardXP(String userId, int amount) {
        UserXP userXP = getOrCreateXP(userId);
        userXP.setXp(userXP.getXp() + amount);
        
        // Simple level logic: Level = (XP / 500) + 1
        int newLevel = (userXP.getXp() / 500) + 1;
        if (newLevel > userXP.getLevel()) {
            userXP.setLevel(newLevel);
            log.info("User {} leveled up to level {}", userId, newLevel);
        }
        userXPRepository.save(userXP);
    }

    public void awardSIWEXP(String userId) {
        UserXP userXP = getOrCreateXP(userId);
        if (!userXP.getBadges().contains("Web3 Explorer")) {
            userXP.getBadges().add("Web3 Explorer");
            userXPRepository.save(userXP);
            awardXP(userId, 150);
            log.info("User {} awarded Web3 Explorer badge", userId);
        }
    }

    public void evaluateTradeForBadges(String userId, ClosedTrade trade) {
        UserXP userXP = getOrCreateXP(userId);
        boolean updated = false;

        // Award "First Step" badge
        if (!userXP.getBadges().contains("First Step")) {
            userXP.getBadges().add("First Step");
            updated = true;
            userXPRepository.save(userXP);
            awardXP(userId, 100);
        }

        // Award "Profit Taker" badge
        if (trade.getPnl() != null && trade.getPnl() > 1000 && !userXP.getBadges().contains("Profit Taker")) {
            userXP.getBadges().add("Profit Taker");
            updated = true;
            userXPRepository.save(userXP);
            awardXP(userId, 200);
        }

        // Award "Risk Master" badge for trade with R:R >= 2.0
        if (trade.getPreTradeRnR() != null && trade.getPreTradeRnR() >= 2.0 && !userXP.getBadges().contains("Risk Master")) {
            userXP.getBadges().add("Risk Master");
            updated = true;
            userXPRepository.save(userXP);
            awardXP(userId, 300);
        }

        // Award "Diamond Hands" for manual trades that are profitable
        if ("take_profit".equalsIgnoreCase(trade.getCloseReason()) && !userXP.getBadges().contains("Diamond Hands")) {
            userXP.getBadges().add("Diamond Hands");
            updated = true;
            userXPRepository.save(userXP);
            awardXP(userId, 250);
        }
    }
}
