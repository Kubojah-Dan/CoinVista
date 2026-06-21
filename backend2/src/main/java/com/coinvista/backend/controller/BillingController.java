package com.coinvista.backend.controller;

import com.coinvista.backend.dto.BillingDto;
import com.coinvista.backend.model.User;
import com.coinvista.backend.service.StripeService;
import com.coinvista.backend.service.BillingService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Slf4j
public class BillingController {

    private final StripeService stripeService;
    private final BillingService billingService;

    @PostMapping("/checkout")
    public ResponseEntity<?> createCheckoutSession(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BillingDto.CheckoutRequest request) {
        try {
            String url = stripeService.createCheckoutSession(
                    user.getId(),
                    request.getPlanId(),
                    request.isAnnual(),
                    request.getSuccessUrl(),
                    request.getCancelUrl()
            );
            BillingDto.SessionResponse response = new BillingDto.SessionResponse();
            response.setUrl(url);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (StripeException e) {
            log.error("Stripe error creating checkout session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Stripe billing error: " + e.getMessage()));
        }
    }

    @PostMapping("/portal")
    public ResponseEntity<?> createPortalSession(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BillingDto.PortalRequest request) {
        try {
            String url = stripeService.createPortalSession(user.getId(), request.getReturnUrl());
            BillingDto.SessionResponse response = new BillingDto.SessionResponse();
            response.setUrl(url);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (StripeException e) {
            log.error("Stripe error creating portal session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Stripe portal error: " + e.getMessage()));
        }
    }

    @PostMapping("/quota/use-ai")
    public ResponseEntity<?> useAiQuota(@AuthenticationPrincipal User user) {
        BillingService.QuotaStatus status = billingService.useAiQuery(user.getId());
        return ResponseEntity.ok(Map.of(
                "allowed", status.isAllowed(),
                "remaining", status.getRemaining()
        ));
    }

    @PostMapping("/quota/use-backtest")
    public ResponseEntity<?> useBacktestQuota(@AuthenticationPrincipal User user) {
        BillingService.QuotaStatus status = billingService.useBacktestRun(user.getId());
        return ResponseEntity.ok(Map.of(
                "allowed", status.isAllowed(),
                "remaining", status.getRemaining()
        ));
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            stripeService.handleWebhook(payload, sigHeader);
            return ResponseEntity.ok().build();
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid signature"));
        } catch (Exception e) {
            log.error("Error processing Stripe webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
