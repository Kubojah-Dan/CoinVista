package com.coinvista.backend.aop;

import com.coinvista.backend.annotation.RequirePlan;
import com.coinvista.backend.model.Plan;
import com.coinvista.backend.model.Subscription;
import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.PlanRepository;
import com.coinvista.backend.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Optional;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class PlanEnforcementAspect {

    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;

    @Around("@annotation(requirePlan) || @within(requirePlan)")
    public Object enforcePlan(ProceedingJoinPoint joinPoint, RequirePlan requirePlan) throws Throwable {
        // If requirePlan is null (when annotation is on the class but we intercepted a method), resolve it
        if (requirePlan == null) {
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            Method method = signature.getMethod();
            requirePlan = method.getAnnotation(RequirePlan.class);
            if (requirePlan == null) {
                requirePlan = joinPoint.getTarget().getClass().getAnnotation(RequirePlan.class);
            }
        }

        if (requirePlan == null) {
            return joinPoint.proceed();
        }

        String requiredPlan = requirePlan.value();
        int requiredLevel = getPlanLevel(requiredPlan);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User)) {
            throw new AccessDeniedException("User must be authenticated to access this feature.");
        }

        User user = (User) auth.getPrincipal();
        String userPlanName = "FREE";

        Optional<Subscription> subOpt = subscriptionRepository.findByUserId(user.getId());
        if (subOpt.isPresent()) {
            Subscription sub = subOpt.get();
            // Only count subscription if it is active or trialing
            if ("active".equals(sub.getStatus()) || "trialing".equals(sub.getStatus())) {
                Optional<Plan> planOpt = planRepository.findById(sub.getPlanId());
                if (planOpt.isPresent()) {
                    userPlanName = planOpt.get().getName();
                }
            }
        }

        int userLevel = getPlanLevel(userPlanName);

        if (userLevel < requiredLevel) {
            log.warn("Access denied for user {} (plan: {}): required plan: {}", user.getId(), userPlanName, requiredPlan);
            throw new AccessDeniedException("Upgrade to " + requiredPlan + " plan to access this feature.");
        }

        return joinPoint.proceed();
    }

    private int getPlanLevel(String planName) {
        if (planName == null) return 0;
        switch (planName.toUpperCase()) {
            case "TRADER": return 1;
            case "PRO": return 2;
            case "ELITE": return 3;
            case "FREE":
            default: return 0;
        }
    }
}
