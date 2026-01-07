import api from "./api";

const BASE_URL = "/email-config";

// ================== FETCH DATA ==================

export async function fetchActiveEmailConfig() {
    try {
        const { data } = await api.get(`${BASE_URL}/active`);
        return data || null;
    } catch (err) {
        console.error("fetchActiveEmailConfig error:", err);
        throw err;
    }
}

export async function fetchAllEmailConfigs() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchAllEmailConfigs error:", err);
        return [];
    }
}

// ================== CREATE ==================

export async function createEmailConfig(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("createEmailConfig error:", err);
        throw err;
    }
}

// ================== TEST ==================

export async function testEmailConnection(email, subject, message) {
    try {
        const { data } = await api.post(`${BASE_URL}/test`, { email, subject, message });
        return data;
    } catch (err) {
        console.error("testEmailConnection error:", err);
        throw err;
    }
}
