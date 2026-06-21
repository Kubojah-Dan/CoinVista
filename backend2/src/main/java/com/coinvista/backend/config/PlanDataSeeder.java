package com.coinvista.backend.config;

import com.coinvista.backend.model.Plan;
import com.coinvista.backend.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class PlanDataSeeder implements CommandLineRunner {

    private final PlanRepository planRepository;

    @Override
    public void run(String... args) {
        if (planRepository.count() == 0) {
            log.info("Seeding subscription plans...");

            // 1. FREE Plan
            Map<String, Integer> freeQuotas = new HashMap<>();
            freeQuotas.put("aiQueries", 10);
            freeQuotas.put("backtestRuns", 3);
            Plan freePlan = new Plan("free", "FREE", 0.0, 0.0, "", "", freeQuotas);
            planRepository.save(freePlan);

            // 2. TRADER Plan
            Map<String, Integer> traderQuotas = new HashMap<>();
            traderQuotas.put("aiQueries", 100);
            traderQuotas.put("backtestRuns", 20);
            Plan traderPlan = new Plan(
                "trader", 
                "TRADER", 
                19.0, 
                190.0, 
                "price_trader_monthly_placeholder", 
                "price_trader_annual_placeholder", 
                traderQuotas
            );
            planRepository.save(traderPlan);

            // 3. PRO Plan
            Map<String, Integer> proQuotas = new HashMap<>();
            proQuotas.put("aiQueries", -1); // -1 = Unlimited
            proQuotas.put("backtestRuns", 100);
            Plan proPlan = new Plan(
                "pro", 
                "PRO", 
                49.0, 
                490.0, 
                "price_pro_monthly_placeholder", 
                "price_pro_annual_placeholder", 
                proQuotas
            );
            planRepository.save(proPlan);

            // 4. ELITE Plan
            Map<String, Integer> eliteQuotas = new HashMap<>();
            eliteQuotas.put("aiQueries", -1);
            eliteQuotas.put("backtestRuns", -1);
            Plan elitePlan = new Plan(
                "elite", 
                "ELITE", 
                99.0, 
                990.0, 
                "price_elite_monthly_placeholder", 
                "price_elite_annual_placeholder", 
                eliteQuotas
            );
            planRepository.save(elitePlan);

            log.info("Plans seeded successfully.");
        }
    }
}
