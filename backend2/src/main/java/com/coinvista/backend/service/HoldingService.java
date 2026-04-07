package com.coinvista.backend.service;

import com.coinvista.backend.dto.HoldingDto;
import com.coinvista.backend.model.Holding;
import com.coinvista.backend.repository.HoldingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HoldingService {

    private final HoldingRepository holdingRepository;
    private final CryptoSecurityService cryptoSecurityService;
    private final PortfolioService portfolioService;

    public List<HoldingDto.View> getHoldings(String userId) {
        List<Holding> holdings = holdingRepository.findByUserIdOrderByCreatedAtDesc(userId);
        HoldingDto.Summary summary = portfolioService.buildSummary(holdings);
        return summary.getHoldings();
    }

    public HoldingDto.View createHolding(String userId, HoldingDto.CreateRequest request) {
        String symbol = normalizeSymbol(request.getSymbol());
        double amount = requirePositiveFinite(request.getAmount(), "Amount");
        double purchasePrice = requirePositiveFinite(request.getPurchasePrice(), "Purchase price");

        Holding holding = new Holding();
        holding.setUserId(userId);
        holding.setCoinId(resolveCoinId(request.getCoinId(), symbol));
        holding.setSymbol(symbol);
        holding.setName(request.getName() == null || request.getName().isBlank()
                ? symbol
                : request.getName().trim());
        holding.setEncryptedAmount(cryptoSecurityService.encrypt(Double.toString(amount)));
        holding.setEncryptedPurchasePrice(cryptoSecurityService.encrypt(Double.toString(purchasePrice)));
        holding.setAmount(amount);
        holding.setPurchasePrice(purchasePrice);
        holding.setNotes(request.getNotes() == null ? null : request.getNotes().trim());
        holding.setEntryDate(Instant.now());

        Holding saved = holdingRepository.save(holding);
        return portfolioService.toView(saved, Map.of());
    }

    public void deleteHolding(String holdingId, String userId) {
        Holding holding = holdingRepository.findByIdAndUserId(holdingId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Holding not found or not authorized"));
        holdingRepository.delete(holding);
    }

    public HoldingDto.Summary getPortfolioSummary(String userId) {
        return portfolioService.buildSummary(holdingRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    public byte[] exportPortfolioCsv(String userId) {
        return portfolioService.buildTaxReportCsv(holdingRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("Symbol is required");
        }
        return symbol.trim().toUpperCase(Locale.US);
    }

    private double requirePositiveFinite(Double value, String fieldName) {
        if (value == null || !Double.isFinite(value) || value <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than 0");
        }
        return value;
    }

    private String resolveCoinId(String coinId, String symbol) {
        if (coinId != null && !coinId.isBlank()) {
            return coinId.trim().toLowerCase(Locale.US);
        }

        return switch (symbol.toLowerCase(Locale.US)) {
            case "btc" -> "bitcoin";
            case "eth" -> "ethereum";
            case "sol" -> "solana";
            case "ada" -> "cardano";
            case "doge" -> "dogecoin";
            default -> symbol.toLowerCase(Locale.US);
        };
    }
}
