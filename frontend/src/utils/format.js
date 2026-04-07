export const toSafeNumber = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const formatCurrency = (value) => {
    if (value === undefined || value === null) return "$0.00";
    const numericValue = toSafeNumber(value, 0);
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue);
};

export const formatNumber = (value, decimals = 2) => {
    if (value === undefined || value === null) return "0";
    const numericValue = toSafeNumber(value, 0);
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(numericValue);
};

export const formatPercentage = (value) => {
    if (value === undefined || value === null) return "0.00%";
    return `${toSafeNumber(value, 0).toFixed(2)}%`;
};
