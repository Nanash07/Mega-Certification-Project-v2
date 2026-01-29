// =============================================================================
// Shared Utility Functions
// =============================================================================


export function getCurrentRole() {
    if (typeof window === "undefined") return "";
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const fromUser = (user.role || "").toString().toUpperCase();
        if (fromUser) return fromUser;
    } catch {
        // Ignore parse errors
    }
    return (localStorage.getItem("role") || "").toString().toUpperCase();
}


export function formatDate(value, locale = "id-ID") {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}


export function formatDateTime(value, locale = "id-ID") {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}


export function hasRole(...roles) {
    const currentRole = getCurrentRole();
    return roles.some((r) => r.toUpperCase() === currentRole);
}


export function isSuperadmin() {
    return getCurrentRole() === "SUPERADMIN";
}


export function isPic() {
    return getCurrentRole() === "PIC";
}


export function isEmployee() {
    const role = getCurrentRole();
    return role === "EMPLOYEE" || role === "PEGAWAI";
}

export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
