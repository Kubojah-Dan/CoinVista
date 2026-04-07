package com.coinvista.backend.service;

import com.coinvista.backend.dto.HoldingDto;
import com.coinvista.backend.model.Holding;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    private static final DateTimeFormatter CSV_DATE_FORMAT =
            DateTimeFormatter.ISO_OFFSET_DATE_TIME.withZone(ZoneOffset.UTC);

    private final CoinGeckoService coinGeckoService;
    private final CryptoSecurityService cryptoSecurityService;

    public PortfolioService(CoinGeckoService coinGeckoService, CryptoSecurityService cryptoSecurityService) {
        this.coinGeckoService = coinGeckoService;
        this.cryptoSecurityService = cryptoSecurityService;
    }

    public HoldingDto.Summary buildSummary(List<Holding> holdings) {
        List<Holding> safeHoldings = holdings == null ? List.of() : holdings;
        Map<String, Map<String, Object>> marketDataByCoinId = fetchMarketData(safeHoldings);

        List<HoldingDto.View> holdingViews = safeHoldings.stream()
                .map(holding -> toView(holding, marketDataByCoinId))
                .sorted(Comparator.comparing(HoldingDto.View::getCurrentValue, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        double totalInvested = holdingViews.stream().mapToDouble(view -> safe(view.getInvestedValue())).sum();
        double totalValue = holdingViews.stream().mapToDouble(view -> safe(view.getCurrentValue())).sum();
        double profitLoss = totalValue - totalInvested;
        double roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100.0 : 0.0;

        List<HoldingDto.AllocationSlice> allocation = buildAllocation(holdingViews, totalValue);
        HoldingDto.Summary summary = new HoldingDto.Summary();
        summary.setTotalInvested(round(totalInvested));
        summary.setTotalValue(round(totalValue));
        summary.setProfitLoss(round(profitLoss));
        summary.setRoi(round(roi));
        summary.setDiversificationScore(round(calculateDiversificationScore(allocation)));
        summary.setHoldingCount(holdingViews.size());
        summary.setHoldings(holdingViews);
        summary.setAllocation(allocation);
        return summary;
    }

    public byte[] buildTaxReportCsv(List<Holding> holdings) {
        HoldingDto.Summary summary = buildSummary(holdings);
        StringBuilder csv = new StringBuilder();
        csv.append("Entry Date,Coin ID,Symbol,Name,Amount,Purchase Price,Cost Basis,Current Price,Current Value,Profit/Loss,ROI %,Notes\n");

        for (HoldingDto.View holding : summary.getHoldings()) {
            csv.append(csvValue(holding.getEntryDate() == null ? "" : CSV_DATE_FORMAT.format(holding.getEntryDate())))
                    .append(',')
                    .append(csvValue(holding.getCoinId()))
                    .append(',')
                    .append(csvValue(holding.getSymbol()))
                    .append(',')
                    .append(csvValue(holding.getName()))
                    .append(',')
                    .append(csvValue(number(holding.getAmount())))
                    .append(',')
                    .append(csvValue(number(holding.getPurchasePrice())))
                    .append(',')
                    .append(csvValue(number(holding.getInvestedValue())))
                    .append(',')
                    .append(csvValue(number(holding.getCurrentPrice())))
                    .append(',')
                    .append(csvValue(number(holding.getCurrentValue())))
                    .append(',')
                    .append(csvValue(number(holding.getProfitLoss())))
                    .append(',')
                    .append(csvValue(number(holding.getRoi())))
                    .append(',')
                    .append(csvValue(holding.getNotes()))
                    .append('\n');
        }

        csv.append('\n')
                .append("Portfolio Totals,,,,,,")
                .append(number(summary.getTotalInvested()))
                .append(",,")
                .append(number(summary.getTotalValue()))
                .append(',')
                .append(number(summary.getProfitLoss()))
                .append(',')
                .append(number(summary.getRoi()))
                .append('\n');

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public HoldingDto.View toView(Holding holding, Map<String, Map<String, Object>> marketDataByCoinId) {
        String coinId = resolveCoinId(holding);
        double amount = readAmount(holding);
        double purchasePrice = readPurchasePrice(holding);
        Map<String, Object> marketData = marketDataByCoinId.getOrDefault(coinId, Map.of());
        double currentPrice = marketData.isEmpty()
                ? purchasePrice
                : coinGeckoService.toDouble(marketData.get("current_price"));

        double investedValue = amount * purchasePrice;
        double currentValue = amount * currentPrice;
        double profitLoss = currentValue - investedValue;
        double roi = investedValue > 0 ? (profitLoss / investedValue) * 100.0 : 0.0;

        HoldingDto.View view = new HoldingDto.View();
        view.setId(holding.getId());
        view.setCoinId(coinId);
        view.setSymbol(holding.getSymbol());
        view.setName(holding.getName());
        view.setAmount(round(amount));
        view.setPurchasePrice(round(purchasePrice));
        view.setCurrentPrice(round(currentPrice));
        view.setCurrentValue(round(currentValue));
        view.setInvestedValue(round(investedValue));
        view.setProfitLoss(round(profitLoss));
        view.setRoi(round(roi));
        view.setNotes(holding.getNotes());
        view.setEntryDate(holding.getEntryDate());
        view.setCreatedAt(holding.getCreatedAt());
        return view;
    }

    public double readAmount(Holding holding) {
        if (holding.getEncryptedAmount() != null && !holding.getEncryptedAmount().isBlank()) {
            return parseNumber(cryptoSecurityService.decrypt(holding.getEncryptedAmount()));
        }
        return safe(holding.getAmount());
    }

    public double readPurchasePrice(Holding holding) {
        if (holding.getEncryptedPurchasePrice() != null && !holding.getEncryptedPurchasePrice().isBlank()) {
            return parseNumber(cryptoSecurityService.decrypt(holding.getEncryptedPurchasePrice()));
        }
        return safe(holding.getPurchasePrice());
    }

    public String resolveCoinId(Holding holding) {
        if (holding.getCoinId() != null && !holding.getCoinId().isBlank()) {
            return holding.getCoinId();
        }
        String symbol = holding.getSymbol() == null ? "" : holding.getSymbol().toLowerCase(Locale.US);
        return switch (symbol) {
            case "btc" -> "bitcoin";
            case "eth" -> "ethereum";
            case "sol" -> "solana";
            case "ada" -> "cardano";
            case "doge" -> "dogecoin";
            default -> symbol;
        };
    }

    private Map<String, Map<String, Object>> fetchMarketData(List<Holding> holdings) {
        List<String> coinIds = holdings.stream()
                .map(this::resolveCoinId)
                .filter(coinId -> coinId != null && !coinId.isBlank())
                .distinct()
                .toList();

        return coinGeckoService.getCoinsMarketData(coinIds, "usd").stream()
                .filter(map -> map.get("id") != null)
                .collect(Collectors.toMap(
                        map -> Objects.toString(map.get("id"), ""),
                        map -> map,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private List<HoldingDto.AllocationSlice> buildAllocation(List<HoldingDto.View> holdings, double totalValue) {
        List<HoldingDto.AllocationSlice> allocation = new ArrayList<>();
        for (HoldingDto.View holding : holdings) {
            HoldingDto.AllocationSlice slice = new HoldingDto.AllocationSlice();
            slice.setName(holding.getName());
            slice.setSymbol(holding.getSymbol());
            slice.setValue(round(safe(holding.getCurrentValue())));
            slice.setPercentage(totalValue > 0 ? round((safe(holding.getCurrentValue()) / totalValue) * 100.0) : 0.0);
            allocation.add(slice);
        }
        return allocation;
    }

    private double calculateDiversificationScore(List<HoldingDto.AllocationSlice> allocation) {
        if (allocation.isEmpty()) {
            return 0.0;
        }

        double herfindahl = allocation.stream()
                .mapToDouble(slice -> {
                    double weight = safe(slice.getPercentage()) / 100.0;
                    return weight * weight;
                })
                .sum();

        return Math.max(0.0, (1.0 - herfindahl) * 100.0);
    }

    private String csvValue(Object value) {
        String text = value == null ? "" : value.toString().replace("\"", "\"\"");
        return "\"" + text + "\"";
    }

    private String number(Double value) {
        return String.format(Locale.US, "%.4f", safe(value));
    }

    private double parseNumber(String value) {
        if (value == null || value.isBlank()) {
            return 0.0;
        }
        return Double.parseDouble(value);
    }

    private double safe(Double value) {
        return value == null ? 0.0 : value;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
