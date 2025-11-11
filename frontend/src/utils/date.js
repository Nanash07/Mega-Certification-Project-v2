// src/utils/date.js

const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function formatShortIdDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = date.getDate();
    const month = MONTH_SHORT_ID[date.getMonth()] || "";
    const year = date.getFullYear();
    if (!month) return "-";
    return `${day}-${month}-${year}`;
}

export function formatShortIdDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = date.getDate();
    const month = MONTH_SHORT_ID[date.getMonth()] || "";
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    if (!month) return "-";
    return `${day}-${month}-${year} ${hours}:${minutes}`;
}
