package com.coinvista.backend.service;

import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WatchlistService {

    private final UserRepository userRepository;
    private final CoinGeckoService coinGeckoService;

    public Object getWatchlist(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getWatchlist().isEmpty()) {
            return List.of();
        }
        return coinGeckoService.getCoinsPrices(user.getWatchlist(), "usd");
    }

    public Object addToWatchlist(String userId, String coinId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getWatchlist().contains(coinId)) {
            throw new RuntimeException("Coin already in watchlist");
        }

        user.getWatchlist().add(coinId);
        userRepository.save(user);

        return coinGeckoService.getCoinsPrices(user.getWatchlist(), "usd");
    }

    public Object removeFromWatchlist(String userId, String coinId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.getWatchlist().remove(coinId);
        userRepository.save(user);

        if (user.getWatchlist().isEmpty()) {
            return List.of();
        }
        return coinGeckoService.getCoinsPrices(user.getWatchlist(), "usd");
    }
}
