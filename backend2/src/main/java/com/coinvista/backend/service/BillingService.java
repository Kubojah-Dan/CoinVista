package com.coinvista.backend.service;

import com.coinvista.backend.model.Plan;
import com.coinvista.backend.model.Subscription;
import com.coinvista.backend.model.UsageQuota;
import com.coinvista.backend.repository.PlanRepository;
import com.coinvista.backend.repository.SubscriptionRepository;
import com.coinvista.backend.repository.UsageQuotaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;
    private final UsageQuotaRepository usageQuotaRepository;

    /**
     * Get user's current plan
     */
    public Plan getUserPlan(String userId) {
        Optional<Subscription> subOpt = subscriptionRepository.findByUserId(userId);
        if (subOpt.isPresent()) {
            Subscription sub = subOpt.get();
            if ("active".equals(sub.getStatus()) || "trialing".equals(sub.getStatus())) {
                return planRepository.findById(sub.getPlanId())
                        .orElse(planRepository.findById("free").orElse(null));
            }
        }
        return planRepository.findById("free").orElse(null);
    }

    /**
     * Check and consume one AI query quota
     */
    public QuotaStatus useAiQuery(String userId) {
        Plan plan = getUserPlan(userId);
        if (plan == null) {
            return new QuotaStatus(false, 0);
        }

        int limit = plan.getQuotas().getOrDefault("aiQueries", 10);
        if (limit == -1) {
            // Unlimited
            return new QuotaStatus(true, -1);
        }

        UsageQuota quota = usageQuotaRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UsageQuota newQuota = new UsageQuota();
                    newQuota.setUserId(userId);
                    newQuota.setResetAt(Instant.now().plus(7, ChronoUnit.DAYS));
                    return newQuota;
                });

        // Check if reset period has passed
        if (Instant.now().isAfter(quota.getResetAt())) {
            quota.setAiQueriesUsed(0);
            quota.setBacktestRunsUsed(0);
            quota.setResetAt(Instant.now().plus(7, ChronoUnit.DAYS));
        }

        if (quota.getAiQueriesUsed() >= limit) {
            return new QuotaStatus(false, 0);
        }

        quota.setAiQueriesUsed(quota.getAiQueriesUsed() + 1);
        quota.setUpdatedAt(Instant.now());
        usageQuotaRepository.save(quota);

        return new QuotaStatus(true, limit - quota.getAiQueriesUsed());
    }

    /**
     * Check and consume one Backtest run quota
     */
    public QuotaStatus useBacktestRun(String userId) {
        Plan plan = getUserPlan(userId);
        if (plan == null) {
            return new QuotaStatus(false, 0);
        }

        int limit = plan.getQuotas().getOrDefault("backtestRuns", 3);
        if (limit == -1) {
            // Unlimited
            return new QuotaStatus(true, -1);
        }

        UsageQuota quota = usageQuotaRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UsageQuota newQuota = new UsageQuota();
                    newQuota.setUserId(userId);
                    newQuota.setResetAt(Instant.now().plus(7, ChronoUnit.DAYS));
                    return newQuota;
                });

        // Check if reset period has passed
        if (Instant.now().isAfter(quota.getResetAt())) {
            quota.setAiQueriesUsed(0);
            quota.setBacktestRunsUsed(0);
            quota.setResetAt(Instant.now().plus(7, ChronoUnit.DAYS));
        }

        if (quota.getBacktestRunsUsed() >= limit) {
            return new QuotaStatus(false, 0);
        }

        quota.setBacktestRunsUsed(quota.getBacktestRunsUsed() + 1);
        quota.setUpdatedAt(Instant.now());
        usageQuotaRepository.save(quota);

        return new QuotaStatus(true, limit - quota.getBacktestRunsUsed());
    }

    public static class QuotaStatus {
        private final boolean allowed;
        private final int remaining;

        public QuotaStatus(boolean allowed, int remaining) {
            this.allowed = allowed;
            this.remaining = remaining;
        }

        public boolean isAllowed() {
            return allowed;
        }

        public int getRemaining() {
            return remaining;
        }
    }
}
