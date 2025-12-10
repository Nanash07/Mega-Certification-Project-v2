// src/services/authService.js
import api from "./api";

const BASE_URL = "/auth";

export async function login({ username, password }) {
    try {
        const { data } = await api.post(`${BASE_URL}/login`, {
            username,
            password,
        });
        return data;
    } catch (err) {
        console.error("login error:", err);
        throw err;
    }
}

export async function forgotPassword({ email, username }) {
    const payload = {};
    if (email && email.trim()) payload.email = email.trim();
    if (username && username.trim()) payload.username = username.trim();

    const { data } = await api.post(`${BASE_URL}/forgot-password`, payload);
    return data;
}

export async function resetPassword({ token, newPassword }) {
    try {
        const { data } = await api.post(`${BASE_URL}/reset-password`, {
            token,
            newPassword,
        });
        return data;
    } catch (err) {
        console.error("resetPassword error:", err);
        throw err;
    }
}

export async function validateResetToken(token) {
    try {
        const { data } = await api.get(`${BASE_URL}/reset-password/validate`, {
            params: { token },
        });
        return data?.valid === true;
    } catch (err) {
        console.error("validateResetToken error:", err);
        return false;
    }
}

export async function changePasswordFirstLogin({ username, newPassword }) {
    try {
        const { data } = await api.post(`${BASE_URL}/change-password-first-login`, {
            username,
            newPassword,
        });
        return data;
    } catch (err) {
        console.error("changePasswordFirstLogin error:", err);
        throw err;
    }
}
