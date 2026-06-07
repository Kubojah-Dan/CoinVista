package com.coinvista.backend.service;

import com.coinvista.backend.dto.PaperTradingDto;
import com.coinvista.backend.model.*;
import com.coinvista.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaperTradingService {

    private static final double DEFAULT_STARTING_BALANCE = 10000.0;

    private final UserRepository userRepository;
    private final PaperPositionRepository paperPositionRepository;
    private final ClosedTradeRepository closedTradeRepository;
    private final AgentPerformanceRepository agentPerformanceRepository;
    private final CoinGeckoService coinGeckoService;

    public PaperTradingDto.Summary getSummary(String userId) {
        User user = getUser(userId);
        user = normalizePaperBalances(user);

        // Fetch active positions
        List<PaperPosition> activePositions = paperPositionRepository.findByUserId(userId);
        
        // Enrich positions with current price from CoinGecko
        List<String> coinIds = activePositions.stream().map(PaperPosition::getCoinId).distinct().toList();
        Map<String, Map<String, Object>> marketData = new HashMap<>();
        if (!coinIds.isEmpty()) {
            marketData = coinGeckoService.getCoinsMarketData(coinIds, "usd").stream()
                    .filter(item -> item.get("id") != null)
                    .collect(Collectors.toMap(
                            item -> item.get("id").toString(),
                            item -> item,
                            (l, r) -> l
                    ));
        }

        List<PaperTradingDto.PositionView> positionViews = new ArrayList<>();
        double marketValue = 0.0;
        double unrealizedPnl = 0.0;

        for (PaperPosition pos : activePositions) {
            Map<String, Object> data = marketData.getOrDefault(pos.getCoinId(), Map.of());
            double currentPrice = data.isEmpty() ? pos.getEntryPrice() : coinGeckoService.toDouble(data.get("current_price"));
            
            double posValue;
            double costBasis = pos.getEntryPrice() * pos.getSize();
            double posUnrealizedPnl;
            
            if ("short".equalsIgnoreCase(pos.getSide())) {
                // Short PnL = (Entry - Current) * Size
                posUnrealizedPnl = (pos.getEntryPrice() - currentPrice) * pos.getSize();
                // Short position value = CostBasis + PnL
                posValue = costBasis + posUnrealizedPnl;
            } else {
                // Long PnL = (Current - Entry) * Size
                posUnrealizedPnl = (currentPrice - pos.getEntryPrice()) * pos.getSize();
                posValue = currentPrice * pos.getSize();
            }

            double roi = costBasis > 0 ? (posUnrealizedPnl / costBasis) * 100.0 : 0.0;

            PaperTradingDto.PositionView view = new PaperTradingDto.PositionView();
            view.setId(pos.getId());
            view.setCoinId(pos.getCoinId());
            view.setSymbol(pos.getSymbol());
            view.setName(pos.getName());
            view.setQuantity(round(pos.getSize()));
            view.setAverageCost(round(pos.getEntryPrice()));
            view.setCurrentPrice(round(currentPrice));
            view.setMarketValue(round(posValue));
            view.setUnrealizedPnl(round(posUnrealizedPnl));
            view.setRoi(round(roi));
            view.setSide(pos.getSide().toLowerCase());
            view.setStopLoss(pos.getStopLoss() != null ? round(pos.getStopLoss()) : null);
            view.setTakeProfit(pos.getTakeProfit() != null ? round(pos.getTakeProfit()) : null);
            view.setStrategy(pos.getStrategy());
            view.setOpenedAt(pos.getOpenedAt());
            positionViews.add(view);

            marketValue += posValue;
            unrealizedPnl += posUnrealizedPnl;
        }

        // Fetch closed trades
        List<ClosedTrade> closedTrades = closedTradeRepository.findByUserIdOrderByClosedAtDesc(userId);
        List<PaperTradingDto.TradeView> tradeViews = closedTrades.stream().map(this::toTradeView).toList();

        // Calculate total realized PnL
        double totalRealizedPnl = closedTrades.stream().mapToDouble(ClosedTrade::getPnl).sum();

        // Fetch Agent performance statistics
        List<AgentPerformance> performanceStats = agentPerformanceRepository.findByUserId(userId);
        List<PaperTradingDto.PerformanceView> performanceViews = performanceStats.stream()
                .map(this::toPerformanceView)
                .toList();

        PaperTradingDto.Summary summary = new PaperTradingDto.Summary();
        summary.setStartingBalance(round(user.getPaperStartingBalance()));
        summary.setCashBalance(round(user.getPaperCashBalance()));
        summary.setMarketValue(round(marketValue));
        summary.setTotalValue(round(user.getPaperCashBalance() + marketValue));
        summary.setRealizedPnl(round(totalRealizedPnl));
        summary.setUnrealizedPnl(round(unrealizedPnl));
        summary.setTotalPnl(round((user.getPaperCashBalance() + marketValue) - user.getPaperStartingBalance()));
        summary.setPaperTradingEnabled(user.isPaperTradingEnabled());
        summary.setLiveTradingEnabled(user.isLiveTradingEnabled());
        summary.setPositions(positionViews);
        summary.setTrades(tradeViews);
        summary.setPerformance(performanceViews);
        return summary;
    }

    public PaperTradingDto.Summary placeTrade(String userId, PaperTradingDto.TradeRequest request) {
        User user = getUser(userId);
        user = normalizePaperBalances(user);

        double currentPrice = coinGeckoService.getCurrentPrice(request.getCoinId(), "usd");
        double orderValue = currentPrice * request.getQuantity();

        // Retrieve existing position for the asset
        Optional<PaperPosition> existingOpt = paperPositionRepository.findByUserIdAndCoinId(userId, request.getCoinId());
        String requestSide = request.getSide().toLowerCase(); // buy or sell

        if ("buy".equals(requestSide)) {
            // BUY Action
            if (existingOpt.isPresent() && "short".equalsIgnoreCase(existingOpt.get().getSide())) {
                // We are buying to cover a Short position
                PaperPosition pos = existingOpt.get();
                closeOrReducePosition(user, pos, request.getQuantity(), currentPrice, "manual");
            } else {
                // We are opening/adding to a Long position
                if (user.getPaperCashBalance() < orderValue) {
                    throw new IllegalArgumentException(String.format(
                            Locale.US,
                            "Insufficient simulator balance. Cash: $%.2f, required: $%.2f.",
                            user.getPaperCashBalance(),
                            orderValue
                    ));
                }
                user.setPaperCashBalance(user.getPaperCashBalance() - orderValue);
                userRepository.save(user);

                PaperPosition pos = existingOpt.orElse(new PaperPosition());
                pos.setUserId(userId);
                pos.setCoinId(request.getCoinId());
                pos.setSymbol(request.getSymbol().toUpperCase());
                pos.setName(request.getName());
                pos.setSide("long");
                pos.setStopLoss(request.getStopLoss());
                pos.setTakeProfit(request.getTakeProfit());
                pos.setStrategy(request.getStrategy() != null ? request.getStrategy() : "Manual");

                if (existingOpt.isPresent()) {
                    // Accumulate size and calculate average entry price
                    double newSize = pos.getSize() + request.getQuantity();
                    double totalCost = (pos.getEntryPrice() * pos.getSize()) + orderValue;
                    pos.setEntryPrice(totalCost / newSize);
                    pos.setSize(newSize);
                } else {
                    pos.setEntryPrice(currentPrice);
                    pos.setSize(request.getQuantity());
                    pos.setOpenedAt(Instant.now());
                }
                paperPositionRepository.save(pos);
            }
        } else {
            // SELL Action
            if (existingOpt.isPresent() && "long".equalsIgnoreCase(existingOpt.get().getSide())) {
                // We are selling to close a Long position
                PaperPosition pos = existingOpt.get();
                closeOrReducePosition(user, pos, request.getQuantity(), currentPrice, "manual");
            } else {
                // We are opening/adding to a Short position
                if (user.getPaperCashBalance() < orderValue) {
                    throw new IllegalArgumentException(String.format(
                            Locale.US,
                            "Insufficient cash for short margin. Cash: $%.2f, required margin: $%.2f.",
                            user.getPaperCashBalance(),
                            orderValue
                    ));
                }
                // Shorting deducts margin from balance (simplified: cash remains the collateral, PnL settled on close)
                user.setPaperCashBalance(user.getPaperCashBalance() - orderValue);
                userRepository.save(user);

                PaperPosition pos = existingOpt.orElse(new PaperPosition());
                pos.setUserId(userId);
                pos.setCoinId(request.getCoinId());
                pos.setSymbol(request.getSymbol().toUpperCase());
                pos.setName(request.getName());
                pos.setSide("short");
                pos.setStopLoss(request.getStopLoss());
                pos.setTakeProfit(request.getTakeProfit());
                pos.setStrategy(request.getStrategy() != null ? request.getStrategy() : "Manual");

                if (existingOpt.isPresent()) {
                    double newSize = pos.getSize() + request.getQuantity();
                    double totalCost = (pos.getEntryPrice() * pos.getSize()) + orderValue;
                    pos.setEntryPrice(totalCost / newSize);
                    pos.setSize(newSize);
                } else {
                    pos.setEntryPrice(currentPrice);
                    pos.setSize(request.getQuantity());
                    pos.setOpenedAt(Instant.now());
                }
                paperPositionRepository.save(pos);
            }
        }

        return getSummary(userId);
    }

    public void closeOrReducePosition(User user, PaperPosition pos, double quantity, double exitPrice, String closeReason) {
        double closeQty = Math.min(pos.getSize(), quantity);
        double costBasis = pos.getEntryPrice() * closeQty;
        double pnl;

        if ("short".equalsIgnoreCase(pos.getSide())) {
            // Short PnL = (Entry - Exit) * Qty
            pnl = (pos.getEntryPrice() - exitPrice) * closeQty;
        } else {
            // Long PnL = (Exit - Entry) * Qty
            pnl = (exitPrice - pos.getEntryPrice()) * closeQty;
        }

        // Return original size value + PnL back to user's cash balance
        user.setPaperCashBalance(user.getPaperCashBalance() + costBasis + pnl);
        userRepository.save(user);

        // Record closed trade
        ClosedTrade trade = new ClosedTrade();
        trade.setUserId(pos.getUserId());
        trade.setCoinId(pos.getCoinId());
        trade.setSymbol(pos.getSymbol());
        trade.setName(pos.getName());
        trade.setSide(pos.getSide());
        trade.setEntryPrice(pos.getEntryPrice());
        trade.setExitPrice(exitPrice);
        trade.setSize(closeQty);
        trade.setStopLoss(pos.getStopLoss());
        trade.setTakeProfit(pos.getTakeProfit());
        trade.setStrategy(pos.getStrategy());
        trade.setOpenedAt(pos.getOpenedAt());
        trade.setClosedAt(Instant.now());
        trade.setPnl(pnl);
        
        double pnlPct = costBasis > 0 ? (pnl / costBasis) * 100.0 : 0.0;
        trade.setPnlPercent(pnlPct);
        trade.setCloseReason(closeReason);
        closedTradeRepository.save(trade);

        // Update position size or delete
        if (pos.getSize() <= closeQty) {
            paperPositionRepository.delete(pos);
        } else {
            pos.setSize(pos.getSize() - closeQty);
            paperPositionRepository.save(pos);
        }

        // Recalculate Agent Performance metrics for this strategy
        updateAgentPerformance(pos.getUserId(), pos.getStrategy());
    }

    public void updateAgentPerformance(String userId, String strategy) {
        if (strategy == null || strategy.isBlank()) {
            return;
        }

        List<ClosedTrade> trades = closedTradeRepository.findByUserIdAndStrategy(userId, strategy);
        if (trades.isEmpty()) {
            agentPerformanceRepository.findByUserIdAndStrategy(userId, strategy)
                    .ifPresent(agentPerformanceRepository::delete);
            return;
        }

        int totalTrades = trades.size();
        long wins = trades.stream().filter(t -> t.getPnl() > 0).count();
        double winRate = totalTrades > 0 ? ((double) wins / totalTrades) * 100.0 : 0.0;

        double sumPnlPercent = trades.stream().mapToDouble(ClosedTrade::getPnlPercent).sum();
        double avgRnR = totalTrades > 0 ? sumPnlPercent / totalTrades : 0.0;

        // Simplified Sharpe Ratio: average returns over standard deviation of returns
        double sharpeRatio = 0.0;
        if (totalTrades > 1) {
            double mean = avgRnR;
            double varianceSum = trades.stream()
                    .mapToDouble(t -> Math.pow(t.getPnlPercent() - mean, 2))
                    .sum();
            double stdDev = Math.sqrt(varianceSum / totalTrades);
            if (stdDev > 0) {
                sharpeRatio = mean / stdDev;
            }
        } else if (totalTrades == 1) {
            // Default 1 trade baseline
            sharpeRatio = avgRnR > 0 ? 1.0 : avgRnR < 0 ? -1.0 : 0.0;
        }

        // Maximum Drawdown
        double maxDrawdown = 0.0;
        double currentBalance = DEFAULT_STARTING_BALANCE;
        double peak = currentBalance;
        List<ClosedTrade> sortedTrades = trades.stream()
                .sorted(Comparator.comparing(ClosedTrade::getClosedAt))
                .toList();

        for (ClosedTrade t : sortedTrades) {
            currentBalance += t.getPnl();
            if (currentBalance > peak) {
                peak = currentBalance;
            }
            double dd = peak > 0 ? ((peak - currentBalance) / peak) * 100.0 : 0.0;
            if (dd > maxDrawdown) {
                maxDrawdown = dd;
            }
        }

        AgentPerformance perf = agentPerformanceRepository.findByUserIdAndStrategy(userId, strategy)
                .orElse(new AgentPerformance());
        perf.setUserId(userId);
        perf.setStrategy(strategy);
        perf.setTotalTrades(totalTrades);
        perf.setWinRate(round(winRate));
        perf.setAvgRnR(round(avgRnR));
        perf.setSharpeRatio(round(sharpeRatio));
        perf.setMaxDrawdown(round(maxDrawdown));
        perf.setUpdatedAt(Instant.now());
        agentPerformanceRepository.save(perf);
    }

    public PaperTradingDto.Summary reset(String userId) {
        User user = getUser(userId);
        user = normalizePaperBalances(user);
        user.setPaperCashBalance(user.getPaperStartingBalance());
        userRepository.save(user);

        paperPositionRepository.deleteByUserId(userId);
        closedTradeRepository.deleteByUserId(userId);
        agentPerformanceRepository.deleteByUserId(userId);

        return getSummary(userId);
    }

    public void updateAgentExecutionToggle(String userId, boolean paperTradingEnabled, boolean liveTradingEnabled) {
        User user = getUser(userId);
        user.setPaperTradingEnabled(paperTradingEnabled);
        user.setLiveTradingEnabled(liveTradingEnabled);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    public List<PaperPosition> getAllOpenPositions() {
        return paperPositionRepository.findAll();
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private User normalizePaperBalances(User user) {
        boolean changed = false;

        if (user.getPaperStartingBalance() == null || user.getPaperStartingBalance() <= 0) {
            user.setPaperStartingBalance(DEFAULT_STARTING_BALANCE);
            changed = true;
        }

        if (user.getPaperCashBalance() == null || user.getPaperCashBalance() <= 0) {
            user.setPaperCashBalance(user.getPaperStartingBalance());
            changed = true;
        }

        if (changed) {
            user.setUpdatedAt(Instant.now());
            return userRepository.save(user);
        }

        return user;
    }

    private PaperTradingDto.TradeView toTradeView(ClosedTrade trade) {
        PaperTradingDto.TradeView view = new PaperTradingDto.TradeView();
        view.setId(trade.getId());
        view.setCoinId(trade.getCoinId());
        view.setSymbol(trade.getSymbol());
        view.setName(trade.getName());
        view.setSide(trade.getSide());
        view.setAction("long".equalsIgnoreCase(trade.getSide()) ? "sell" : "buy"); // action to close
        view.setQuantity(round(trade.getSize()));
        view.setEntryPrice(round(trade.getEntryPrice()));
        view.setExitPrice(round(trade.getExitPrice()));
        view.setTotalValue(round(trade.getExitPrice() * trade.getSize()));
        view.setRealizedPnl(round(trade.getPnl()));
        view.setPnlPercent(round(trade.getPnlPercent()));
        view.setStrategy(trade.getStrategy());
        view.setCloseReason(trade.getCloseReason());
        view.setOpenedAt(trade.getOpenedAt());
        view.setClosedAt(trade.getClosedAt());
        return view;
    }

    private PaperTradingDto.PerformanceView toPerformanceView(AgentPerformance perf) {
        PaperTradingDto.PerformanceView view = new PaperTradingDto.PerformanceView();
        view.setStrategy(perf.getStrategy());
        view.setTotalTrades(perf.getTotalTrades());
        view.setWinRate(perf.getWinRate());
        view.setAvgRnR(perf.getAvgRnR());
        view.setSharpeRatio(perf.getSharpeRatio());
        view.setMaxDrawdown(perf.getMaxDrawdown());
        return view;
    }

    private double round(Double value) {
        double safe = value == null ? 0.0 : value;
        return Math.round(safe * 100.0) / 100.0;
    }
}
