package com.coinvista.backend.service;

import com.coinvista.backend.dto.AlertDto;
import com.coinvista.backend.model.Alert;
import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.AlertRepository;
import com.coinvista.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final UserRepository userRepository;

    public List<Alert> getAlerts(String userId) {
        return alertRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Alert createAlert(String userId, AlertDto.CreateRequest request) {
        Alert alert = new Alert();
        alert.setUserId(userId);
        alert.setCoinId(request.getCoinId());
        alert.setSymbol(request.getSymbol().toUpperCase());
        alert.setName(request.getName());
        alert.setTargetPrice(request.getTargetPrice());
        alert.setDirection(request.getDirection());
        alert.setTriggered(false);
        alert.setCreatedAt(Instant.now());

        Alert saved = alertRepository.save(alert);

        userRepository.findById(userId).ifPresent(user -> {
            user.getAlerts().add(saved.getId());
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
        });

        return saved;
    }

    public void deleteAlert(String alertId, String userId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found"));

        if (!alert.getUserId().equals(userId)) {
            throw new SecurityException("Not authorized");
        }

        alertRepository.delete(alert);

        userRepository.findById(userId).ifPresent(user -> {
            user.getAlerts().remove(alertId);
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
        });
    }

    public List<Alert> getPendingAlerts() {
        return alertRepository.findByIsTriggeredFalse();
    }

    public Alert markTriggered(Alert alert, double currentPrice) {
        alert.setTriggered(true);
        alert.setLastTriggeredPrice(currentPrice);
        alert.setTriggeredAt(Instant.now());
        return alertRepository.save(alert);
    }

    public Alert save(Alert alert) {
        return alertRepository.save(alert);
    }

    public void delete(Alert alert) {
        if (alert == null) {
            return;
        }

        alertRepository.delete(alert);

        if (alert.getUserId() == null || alert.getUserId().isBlank()) {
            return;
        }

        userRepository.findById(alert.getUserId()).ifPresent(user -> {
            user.getAlerts().remove(alert.getId());
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
        });
    }

    public User getAlertOwner(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    public boolean ownerExists(String userId) {
        return userId != null && !userId.isBlank() && userRepository.existsById(userId);
    }
}
