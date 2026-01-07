import api from "./api";

const BASE_URL = "/units";

// ================== FETCH DATA ==================

export async function fetchUnits(params = {}) {
    try {
        const { data } = await api.get(BASE_URL, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchUnits error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchUnitById(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchUnitById error:", err);
        return null;
    }
}

// ================== CREATE ==================

export async function createUnit(name) {
    try {
        const { data } = await api.post(BASE_URL, null, { params: { name } });
        return data;
    } catch (err) {
        console.error("createUnit error:", err);
        throw err;
    }
}

// ================== TOGGLE ==================

export async function toggleUnit(id) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}/toggle`);
        return data;
    } catch (err) {
        console.error("toggleUnit error:", err);
        throw err;
    }
}
