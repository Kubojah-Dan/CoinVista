package com.coinvista.backend.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "coinvistaDotenv";
    private static final List<Path> CANDIDATE_PATHS = List.of(
            Path.of(".env"),
            Path.of("backend2", ".env"),
            Path.of("..", "backend2", ".env")
    );

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (environment.getPropertySources().contains(PROPERTY_SOURCE_NAME)) {
            return;
        }

        Map<String, Object> properties = new LinkedHashMap<>();
        for (Path candidate : CANDIDATE_PATHS) {
            if (loadDotenv(candidate, properties)) {
                break;
            }
        }

        if (!properties.isEmpty()) {
            environment.getPropertySources().addAfter(
                    StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                    new MapPropertySource(PROPERTY_SOURCE_NAME, properties)
            );
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    private boolean loadDotenv(Path candidate, Map<String, Object> properties) {
        Path absolutePath = candidate.toAbsolutePath().normalize();
        if (!Files.exists(absolutePath) || !Files.isRegularFile(absolutePath)) {
            return false;
        }

        try {
            for (String line : Files.readAllLines(absolutePath)) {
                String trimmed = line.trim();
                if (trimmed.isBlank() || trimmed.startsWith("#")) {
                    continue;
                }
                if (trimmed.startsWith("export ")) {
                    trimmed = trimmed.substring(7).trim();
                }

                int separatorIndex = trimmed.indexOf('=');
                if (separatorIndex <= 0) {
                    continue;
                }

                String key = trimmed.substring(0, separatorIndex).trim();
                String value = trimmed.substring(separatorIndex + 1).trim();
                if (value.length() >= 2 && (
                        (value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))
                )) {
                    value = value.substring(1, value.length() - 1);
                }

                if (!key.isBlank() && !properties.containsKey(key)) {
                    properties.put(key, value);
                }
            }
        } catch (IOException ignored) {
            return false;
        }

        return !properties.isEmpty();
    }
}
