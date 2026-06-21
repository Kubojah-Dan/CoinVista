package com.coinvista.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class BillingDto {

    @Data
    public static class CheckoutRequest {
        @NotBlank(message = "Plan ID is required")
        private String planId;

        private boolean annual = false;

        @NotBlank(message = "Success URL is required")
        private String successUrl;

        @NotBlank(message = "Cancel URL is required")
        private String cancelUrl;
    }

    @Data
    public static class PortalRequest {
        @NotBlank(message = "Return URL is required")
        private String returnUrl;
    }

    @Data
    public static class SessionResponse {
        private String url;
    }
}
