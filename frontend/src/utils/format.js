export const formatCurrency = (value) => {
    if (value === undefined || value === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export const formatNumber = (value, decimals = 2) => {
    if (value === undefined || value === null) return "0";
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};

export const formatPercentage = (value) => {
    if (value === undefined || value === null) return "0.00%";
    return `${Number(value).toFixed(2)}%`;
};
