import React from "react";

export const Input = ({
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    name,
    required = false,
    className = "",
    step,
    disabled
}) => {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}
            <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                step={step}
                disabled={disabled}
                className="w-full px-4 py-3 rounded-xl glass-card border-2 border-transparent focus:border-primary bg-white/50 dark:bg-dark-100/50 text-gray-900 dark:text-gray-100 focus:outline-none placeholder-gray-400 transition-all"
            />
        </div>
    );
};
