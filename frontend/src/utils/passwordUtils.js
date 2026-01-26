

export const PASSWORD_REQUIREMENTS = [
    { id: 'length', label: 'Minimal 8 karakter', test: (pwd) => pwd.length >= 8 },
    { id: 'uppercase', label: 'Minimal 1 huruf besar (A-Z)', test: (pwd) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', label: 'Minimal 1 huruf kecil (a-z)', test: (pwd) => /[a-z]/.test(pwd) },
    { id: 'number', label: 'Minimal 1 angka (0-9)', test: (pwd) => /[0-9]/.test(pwd) },
];


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


export function getPasswordValidationStatus(password) {
    return PASSWORD_REQUIREMENTS.map(req => ({
        id: req.id,
        label: req.label,
        passed: password ? req.test(password) : false
    }));
}
