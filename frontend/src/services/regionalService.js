import api from "./api";

const BASE_URL = "/regionals";

// ================== FETCH DATA ==================

export async function fetchRegionals(params = {}) {
    try {
        const { data } = await api.get(BASE_URL, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchRegionals error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchRegionalById(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchRegionalById error:", err);
        return null;
    }
}

// ================== CREATE ==================

export async function createRegional(name) {
    try {
        const { data } = await api.post(BASE_URL, null, { params: { name } });
        return data;
    } catch (err) {
        console.error("createRegional error:", err);
        throw err;
    }
}

// ================== TOGGLE ==================

export async function toggleRegional(id) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}/toggle`);
        return data;
    } catch (err) {
        console.error("toggleRegional error:", err);
        throw err;
    }
}
