package com.coinvista.backend.service;

import com.coinvista.backend.model.Follow;
import com.coinvista.backend.dto.PaperTradingDto;
import com.coinvista.backend.repository.FollowRepository;
import com.coinvista.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CopyTradingService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    
    @Lazy
    private final PaperTradingService paperTradingService;

    @Async
    public void executeCopyTrades(String leaderUserId, PaperTradingDto.TradeRequest leaderTrade) {
        log.info("Starting copy trade distribution for leader user: {}", leaderUserId);
        List<Follow> copyFollowers = followRepository.findByFollowingIdAndCopyTradingEnabledTrue(leaderUserId);

        for (Follow follow : copyFollowers) {
            try {
                userRepository.findById(follow.getFollowerId()).ifPresent(follower -> {
                    double positionSize = leaderTrade.getQuantity() * (follow.getCopyAllocationPercent() / 100.0);
                    if (positionSize <= 0) return;

                    PaperTradingDto.TradeRequest followerRequest = new PaperTradingDto.TradeRequest();
                    followerRequest.setCoinId(leaderTrade.getCoinId());
                    followerRequest.setSymbol(leaderTrade.getSymbol());
                    followerRequest.setName(leaderTrade.getName());
                    followerRequest.setSide(leaderTrade.getSide());
                    followerRequest.setQuantity(positionSize);
                    followerRequest.setStopLoss(leaderTrade.getStopLoss());
                    followerRequest.setTakeProfit(leaderTrade.getTakeProfit());
                    followerRequest.setStrategy("CopyTrading");
                    followerRequest.setPreTradeThesis("Copied from followed trader");
                    followerRequest.setPreTradeInvalidation("Followed trader exits");
                    followerRequest.setPreTradeRnR(leaderTrade.getPreTradeRnR());

                    paperTradingService.placeTrade(follower.getId(), followerRequest);
                    log.info("Successfully copied trade for follower: {} from leader: {}", follower.getId(), leaderUserId);
                });
            } catch (Exception e) {
                log.error("Failed to copy trade for follower: {}", follow.getFollowerId(), e);
            }
        }
    }
}
