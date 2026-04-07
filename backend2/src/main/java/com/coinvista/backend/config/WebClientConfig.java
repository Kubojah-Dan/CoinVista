package com.coinvista.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${app.coingecko.base-url}")
    private String coingeckoBaseUrl;

    @Bean("coingeckoClient")
    public WebClient coingeckoClient() {
        return WebClient.builder()
                .baseUrl(coingeckoBaseUrl)
                .build();
    }
}
