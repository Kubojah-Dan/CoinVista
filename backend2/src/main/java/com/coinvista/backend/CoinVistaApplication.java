package com.coinvista.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CoinVistaApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoinVistaApplication.class, args);
    }
}
