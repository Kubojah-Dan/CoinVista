import React from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

export const Button = ({
    children,
    className,
    variant = "primary",
    size = "md",
    disabled = false,
    type = "button",
    onClick,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-gradient-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-dark-100 dark:text-gray-100 dark:hover:bg-dark-50",
        outline: "border-2 border-primary text-primary hover:bg-primary/10",
        ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-100",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
    };

    return (
        <button
            type={type}
            className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};
