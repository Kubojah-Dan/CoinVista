package com.coinvista.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

public class AlertDto {

    @Data
    public static class CreateRequest {
        private String coinId;
        @NotBlank
        private String symbol;
        private String name;
        @NotNull
        private Double targetPrice;
        @NotBlank @Pattern(regexp = "above|below")
        private String direction;
    }
}
