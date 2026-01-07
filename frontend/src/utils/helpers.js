// =============================================================================
// Shared Utility Functions
// =============================================================================

/**
 * Get current user role from localStorage
 * @returns {string} Role in uppercase (e.g., "SUPERADMIN", "PIC", "EMPLOYEE")
 */
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

/**
 * Format date to Indonesian locale
 * @param {string|Date} value - Date value to format
 * @param {string} locale - Locale string (default: "id-ID")
 * @returns {string} Formatted date or "-" if invalid
 */
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

/**
 * Format datetime to Indonesian locale
 * @param {string|Date} value - DateTime value to format
 * @param {string} locale - Locale string (default: "id-ID")
 * @returns {string} Formatted datetime or "-" if invalid
 */
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

/**
 * Check if user has role
 * @param {...string} roles - Roles to check
 * @returns {boolean} True if user has any of the roles
 */
export function hasRole(...roles) {
    const currentRole = getCurrentRole();
    return roles.some((r) => r.toUpperCase() === currentRole);
}

/**
 * Check if current user is superadmin
 * @returns {boolean}
 */
export function isSuperadmin() {
    return getCurrentRole() === "SUPERADMIN";
}

/**
 * Check if current user is PIC
 * @returns {boolean}
 */
export function isPic() {
    return getCurrentRole() === "PIC";
}

/**
 * Check if current user is employee
 * @returns {boolean}
 */
export function isEmployee() {
    const role = getCurrentRole();
    return role === "EMPLOYEE" || role === "PEGAWAI";
}
