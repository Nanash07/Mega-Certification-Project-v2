import api from "./api";

const BASE_URL = "/pic-scope";

// ================== FETCH DATA ==================

export async function fetchPicScopes() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchPicScopes error:", err);
        return [];
    }
}

export async function fetchPicScopesByUser(userId) {
    try {
        const { data } = await api.get(`${BASE_URL}/${userId}`);
        return data || null;
    } catch (err) {
        console.error("fetchPicScopesByUser error:", err);
        return null;
    }
}

export async function fetchMyPicScope() {
    try {
        const { data } = await api.get(`${BASE_URL}/me`);
        return data || null;
    } catch (err) {
        console.error("fetchMyPicScope error:", err);
        return null;
    }
}

// ================== UPDATE ==================

export async function assignPicScope(userId, certificationIds) {
    try {
        const { data } = await api.put(`${BASE_URL}/${userId}`, { certificationIds });
        return data;
    } catch (err) {
        console.error("assignPicScope error:", err);
        throw err;
    }
}
