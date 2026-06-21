package com.coinvista.backend.service;

import com.coinvista.backend.model.Plan;
import com.coinvista.backend.model.Subscription;
import com.coinvista.backend.repository.PlanRepository;
import com.coinvista.backend.repository.SubscriptionRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StripeService {

    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;

    @Value("${stripe.api.key}")
    private String apiKey;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @PostConstruct
    public void init() {
        Stripe.apiKey = apiKey;
    }

    /**
     * Create a Stripe Checkout Session for a subscription plan
     */
    public String createCheckoutSession(String userId, String planId, boolean isAnnual, String successUrl, String cancelUrl) throws StripeException {
        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + planId));

        String priceId = isAnnual ? plan.getStripeAnnualPriceId() : plan.getStripeMonthlyPriceId();

        if (priceId == null || priceId.isEmpty() || priceId.contains("placeholder")) {
            throw new IllegalArgumentException("Stripe Price ID not configured for this plan/interval");
        }

        // Check if customer already exists for this user
        Optional<Subscription> existingSub = subscriptionRepository.findByUserId(userId);
        String customerId = existingSub.map(Subscription::getStripeCustomerId).orElse(null);

        SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .setClientReferenceId(userId)
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setPrice(priceId)
                                .setQuantity(1L)
                                .build()
                );

        if (customerId != null) {
            paramsBuilder.setCustomer(customerId);
        } else {
            // Stripe will create a customer automatically and we will link it in the webhook
            paramsBuilder.setCustomerEmail(userId); // Assuming userId can be treated as email, or we can look up user
        }

        Session session = Session.create(paramsBuilder.build());
        return session.getUrl();
    }

    /**
     * Create a Stripe Customer Portal redirect URL
     */
    public String createPortalSession(String userId, String returnUrl) throws StripeException {
        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("No subscription found for user: " + userId));

        if (subscription.getStripeCustomerId() == null) {
            throw new IllegalStateException("User does not have a Stripe Customer ID");
        }

        com.stripe.param.billingportal.SessionCreateParams params = com.stripe.param.billingportal.SessionCreateParams.builder()
                .setCustomer(subscription.getStripeCustomerId())
                .setReturnUrl(returnUrl)
                .build();

        com.stripe.model.billingportal.Session portalSession = com.stripe.model.billingportal.Session.create(params);
        return portalSession.getUrl();
    }

    /**
     * Handle incoming Stripe webhooks
     */
    public void handleWebhook(String payload, String sigHeader) throws SignatureVerificationException {
        Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);

        log.info("Received Stripe webhook event: {}", event.getType());

        EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
        if (!dataObjectDeserializer.getObject().isPresent()) {
            log.error("Stripe event serialization failed for event: {}", event.getId());
            return;
        }

        switch (event.getType()) {
            case "checkout.session.completed":
                handleCheckoutSessionCompleted((Session) dataObjectDeserializer.getObject().get());
                break;
            case "customer.subscription.created":
            case "customer.subscription.updated":
                handleSubscriptionCreatedOrUpdated((com.stripe.model.Subscription) dataObjectDeserializer.getObject().get());
                break;
            case "customer.subscription.deleted":
                handleSubscriptionDeleted((com.stripe.model.Subscription) dataObjectDeserializer.getObject().get());
                break;
            default:
                log.debug("Unhandled event type: {}", event.getType());
                break;
        }
    }

    private void handleCheckoutSessionCompleted(Session session) {
        String userId = session.getClientReferenceId();
        String customerId = session.getCustomer();
        String stripeSubId = session.getSubscription();

        if (userId == null) {
            log.warn("checkout.session.completed received without clientReferenceId (userId)");
            return;
        }

        log.info("Billing checkout completed for user: {}, customerId: {}, subId: {}", userId, customerId, stripeSubId);

        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElse(new Subscription());

        subscription.setUserId(userId);
        subscription.setStripeCustomerId(customerId);
        subscription.setStripeSubscriptionId(stripeSubId);
        subscription.setUpdatedAt(Instant.now());
        subscriptionRepository.save(subscription);
    }

    private void handleSubscriptionCreatedOrUpdated(com.stripe.model.Subscription stripeSub) {
        String customerId = stripeSub.getCustomer();
        String stripeSubId = stripeSub.getId();
        String status = stripeSub.getStatus();

        log.info("Subscription created/updated. SubId: {}, status: {}", stripeSubId, status);

        // Find subscription by customerId or subscriptionId
        Subscription subscription = subscriptionRepository.findByStripeSubscriptionId(stripeSubId)
                .or(() -> subscriptionRepository.findByStripeCustomerId(customerId))
                .orElse(new Subscription());

        subscription.setStripeCustomerId(customerId);
        subscription.setStripeSubscriptionId(stripeSubId);
        subscription.setStatus(status);
        subscription.setCurrentPeriodStart(Instant.ofEpochSecond(stripeSub.getCurrentPeriodStart()));
        subscription.setCurrentPeriodEnd(Instant.ofEpochSecond(stripeSub.getCurrentPeriodEnd()));
        subscription.setCancelAtPeriodEnd(stripeSub.getCancelAtPeriodEnd());

        // Resolve plan based on Stripe Price ID
        if (stripeSub.getItems().getData().size() > 0) {
            String priceId = stripeSub.getItems().getData().get(0).getPrice().getId();
            
            // Search plans for matching price ID
            Optional<Plan> planOpt = planRepository.findAll().stream()
                    .filter(p -> priceId.equals(p.getStripeMonthlyPriceId()) || priceId.equals(p.getStripeAnnualPriceId()))
                    .findFirst();

            if (planOpt.isPresent()) {
                subscription.setPlanId(planOpt.get().getId());
                log.info("Associated subscription with plan: {}", planOpt.get().getName());
            } else {
                log.warn("No local plan found matching Stripe Price ID: {}", priceId);
            }
        }

        subscription.setUpdatedAt(Instant.now());
        subscriptionRepository.save(subscription);
    }

    private void handleSubscriptionDeleted(com.stripe.model.Subscription stripeSub) {
        String stripeSubId = stripeSub.getId();
        log.info("Subscription deleted/canceled. SubId: {}", stripeSubId);

        Optional<Subscription> subOpt = subscriptionRepository.findByStripeSubscriptionId(stripeSubId);
        if (subOpt.isPresent()) {
            Subscription subscription = subOpt.get();
            subscription.setStatus("canceled");
            subscription.setPlanId("free"); // Downgrade to FREE plan
            subscription.setUpdatedAt(Instant.now());
            subscriptionRepository.save(subscription);
            log.info("Subscription downgraded to FREE plan for user: {}", subscription.getUserId());
        }
    }
}
