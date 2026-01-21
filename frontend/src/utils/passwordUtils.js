/**
 * Password validation utilities
 * 
 * Requirements:
 * - Minimal 8 karakter
 * - Minimal 1 huruf besar (A-Z)
 * - Minimal 1 huruf kecil (a-z)
 * - Minimal 1 angka (0-9)
 */

export const PASSWORD_REQUIREMENTS = [
    { id: 'length', label: 'Minimal 8 karakter', test: (pwd) => pwd.length >= 8 },
    { id: 'uppercase', label: 'Minimal 1 huruf besar (A-Z)', test: (pwd) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', label: 'Minimal 1 huruf kecil (a-z)', test: (pwd) => /[a-z]/.test(pwd) },
    { id: 'number', label: 'Minimal 1 angka (0-9)', test: (pwd) => /[0-9]/.test(pwd) },
];

/**
 * Validate password against all requirements
 * @param {string} password 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validatePassword(password) {
    if (!password) {
        return { isValid: false, errors: ['Password wajib diisi'] };
    }

    const errors = PASSWORD_REQUIREMENTS
        .filter(req => !req.test(password))
        .map(req => req.label);

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Get validation status for each requirement
 * @param {string} password 
 * @returns {Array<{ id: string, label: string, passed: boolean }>}
 */
export function getPasswordValidationStatus(password) {
    return PASSWORD_REQUIREMENTS.map(req => ({
        id: req.id,
        label: req.label,
        passed: password ? req.test(password) : false
    }));
}
