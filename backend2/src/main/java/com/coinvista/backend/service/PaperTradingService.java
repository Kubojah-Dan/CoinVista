package com.coinvista.backend.service;

import com.coinvista.backend.dto.PaperTradingDto;
import com.coinvista.backend.model.PaperTrade;
import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.PaperTradeRepository;
import com.coinvista.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaperTradingService {

    private static final double DEFAULT_STARTING_BALANCE = 10000.0;

    private final PaperTradeRepository paperTradeRepository;
    private final UserRepository userRepository;
    private final CoinGeckoService coinGeckoService;

    public PaperTradingDto.Summary getSummary(String userId) {
        List<PaperTrade> descendingTrades = paperTradeRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<PaperTrade> ascendingTrades = paperTradeRepository.findByUserIdOrderByCreatedAtAsc(userId);
        User user = normalizePaperBalances(getUser(userId), !ascendingTrades.isEmpty());

        Ledger ledger = buildLedger(ascendingTrades);
        Map<String, Map<String, Object>> marketData = coinGeckoService.getCoinsMarketData(
                ledger.positions.keySet().stream().toList(),
                "usd"
        ).stream().collect(LinkedHashMap::new, (map, item) -> map.put(item.get("id").toString(), item), Map::putAll);

        List<PaperTradingDto.PositionView> positions = new ArrayList<>();
        double marketValue = 0.0;
        double unrealizedPnl = 0.0;

        for (PositionState position : ledger.positions.values()) {
            if (position.quantity <= 0) {
                continue;
            }

            Map<String, Object> data = marketData.getOrDefault(position.coinId, Map.of());
            double currentPrice = data.isEmpty() ? position.averageCost : coinGeckoService.toDouble(data.get("current_price"));
            double positionMarketValue = currentPrice * position.quantity;
            double costBasis = position.averageCost * position.quantity;
            double positionUnrealizedPnl = positionMarketValue - costBasis;
            double roi = costBasis > 0 ? (positionUnrealizedPnl / costBasis) * 100.0 : 0.0;

            PaperTradingDto.PositionView view = new PaperTradingDto.PositionView();
            view.setCoinId(position.coinId);
            view.setSymbol(position.symbol);
            view.setName(position.name);
            view.setQuantity(round(position.quantity));
            view.setAverageCost(round(position.averageCost));
            view.setCurrentPrice(round(currentPrice));
            view.setMarketValue(round(positionMarketValue));
            view.setUnrealizedPnl(round(positionUnrealizedPnl));
            view.setRoi(round(roi));
            positions.add(view);

            marketValue += positionMarketValue;
            unrealizedPnl += positionUnrealizedPnl;
        }

        PaperTradingDto.Summary summary = new PaperTradingDto.Summary();
        summary.setStartingBalance(round(user.getPaperStartingBalance()));
        summary.setCashBalance(round(user.getPaperCashBalance()));
        summary.setMarketValue(round(marketValue));
        summary.setTotalValue(round(user.getPaperCashBalance() + marketValue));
        summary.setRealizedPnl(round(ledger.realizedPnl));
        summary.setUnrealizedPnl(round(unrealizedPnl));
        summary.setTotalPnl(round((user.getPaperCashBalance() + marketValue) - user.getPaperStartingBalance()));
        summary.setPositions(positions.stream()
                .sorted(Comparator.comparing(PaperTradingDto.PositionView::getMarketValue, Comparator.reverseOrder()))
                .toList());
        summary.setTrades(descendingTrades.stream().map(this::toView).toList());
        return summary;
    }

    public PaperTradingDto.Summary placeTrade(String userId, PaperTradingDto.TradeRequest request) {
        List<PaperTrade> existingTrades = paperTradeRepository.findByUserIdOrderByCreatedAtAsc(userId);
        User user = normalizePaperBalances(getUser(userId), !existingTrades.isEmpty());
        Ledger ledger = buildLedger(existingTrades);
        PositionState currentPosition = ledger.positions.get(request.getCoinId());

        double currentPrice = coinGeckoService.getCurrentPrice(request.getCoinId(), "usd");
        double totalValue = currentPrice * request.getQuantity();
        String side = request.getSide().toLowerCase(Locale.US);
        double realizedPnl = 0.0;

        if ("buy".equals(side)) {
            if (user.getPaperCashBalance() < totalValue) {
                throw new IllegalArgumentException(String.format(
                        Locale.US,
                        "Insufficient simulator cash balance. Available: $%.2f, required: $%.2f.",
                        user.getPaperCashBalance(),
                        totalValue
                ));
            }
            user.setPaperCashBalance(user.getPaperCashBalance() - totalValue);
        } else {
            if (currentPosition == null || currentPosition.quantity < request.getQuantity()) {
                throw new IllegalArgumentException("Not enough simulator position to sell");
            }
            realizedPnl = (currentPrice - currentPosition.averageCost) * request.getQuantity();
            user.setPaperCashBalance(user.getPaperCashBalance() + totalValue);
        }

        userRepository.save(user);

        PaperTrade trade = new PaperTrade();
        trade.setUserId(userId);
        trade.setCoinId(request.getCoinId());
        trade.setSymbol(request.getSymbol().toUpperCase(Locale.US));
        trade.setName(request.getName());
        trade.setSide(side);
        trade.setQuantity(request.getQuantity());
        trade.setExecutedPrice(currentPrice);
        trade.setTotalValue(totalValue);
        trade.setRealizedPnl(realizedPnl);
        trade.setCreatedAt(Instant.now());
        paperTradeRepository.save(trade);

        return getSummary(userId);
    }

    public PaperTradingDto.Summary reset(String userId) {
        User user = getUser(userId);
        user = normalizePaperBalances(user, false);
        user.setPaperCashBalance(user.getPaperStartingBalance());
        userRepository.save(user);
        paperTradeRepository.deleteByUserId(userId);
        return getSummary(userId);
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private User normalizePaperBalances(User user, boolean hasTradeHistory) {
        boolean changed = false;

        if (user.getPaperStartingBalance() == null || user.getPaperStartingBalance() <= 0) {
            user.setPaperStartingBalance(DEFAULT_STARTING_BALANCE);
            changed = true;
        }

        if (user.getPaperCashBalance() == null || (!hasTradeHistory && user.getPaperCashBalance() <= 0)) {
            user.setPaperCashBalance(user.getPaperStartingBalance());
            changed = true;
        }

        if (changed) {
            user.setUpdatedAt(Instant.now());
            return userRepository.save(user);
        }

        return user;
    }

    private Ledger buildLedger(List<PaperTrade> trades) {
        Ledger ledger = new Ledger();

        for (PaperTrade trade : trades) {
            PositionState position = ledger.positions.computeIfAbsent(trade.getCoinId(), key ->
                    new PositionState(trade.getCoinId(), trade.getSymbol(), trade.getName())
            );

            if ("buy".equalsIgnoreCase(trade.getSide())) {
                double newQuantity = position.quantity + trade.getQuantity();
                double totalCost = (position.averageCost * position.quantity) + (trade.getExecutedPrice() * trade.getQuantity());
                position.quantity = newQuantity;
                position.averageCost = newQuantity > 0 ? totalCost / newQuantity : 0.0;
            } else {
                position.quantity = Math.max(0.0, position.quantity - trade.getQuantity());
                if (position.quantity == 0.0) {
                    position.averageCost = 0.0;
                }
                ledger.realizedPnl += trade.getRealizedPnl() == null ? 0.0 : trade.getRealizedPnl();
            }
        }

        return ledger;
    }

    private PaperTradingDto.TradeView toView(PaperTrade trade) {
        PaperTradingDto.TradeView view = new PaperTradingDto.TradeView();
        view.setId(trade.getId());
        view.setCoinId(trade.getCoinId());
        view.setSymbol(trade.getSymbol());
        view.setName(trade.getName());
        view.setSide(trade.getSide());
        view.setQuantity(round(trade.getQuantity()));
        view.setExecutedPrice(round(trade.getExecutedPrice()));
        view.setTotalValue(round(trade.getTotalValue()));
        view.setRealizedPnl(round(trade.getRealizedPnl()));
        view.setCreatedAt(trade.getCreatedAt());
        return view;
    }

    private double round(Double value) {
        double safe = value == null ? 0.0 : value;
        return Math.round(safe * 100.0) / 100.0;
    }

    private static class Ledger {
        private final Map<String, PositionState> positions = new LinkedHashMap<>();
        private double realizedPnl = 0.0;
    }

    private static class PositionState {
        private final String coinId;
        private final String symbol;
        private final String name;
        private double quantity = 0.0;
        private double averageCost = 0.0;

        private PositionState(String coinId, String symbol, String name) {
            this.coinId = coinId;
            this.symbol = symbol;
            this.name = name;
        }
    }
}
