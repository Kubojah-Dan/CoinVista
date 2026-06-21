package com.coinvista.backend.annotation;

import java.lang.annotation.*;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequirePlan {
    String value(); // Plan name required, e.g., "TRADER", "PRO", "ELITE"
}
