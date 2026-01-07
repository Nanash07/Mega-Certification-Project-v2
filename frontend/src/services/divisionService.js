import api from "./api";

const BASE_URL = "/divisions";

// ================== FETCH DATA ==================

export async function fetchDivisions(params = {}) {
    try {
        const { data } = await api.get(BASE_URL, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchDivisions error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchDivisionById(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchDivisionById error:", err);
        return null;
    }
}

// ================== CREATE ==================

export async function createDivision(name) {
    try {
        const { data } = await api.post(BASE_URL, null, { params: { name } });
        return data;
    } catch (err) {
        console.error("createDivision error:", err);
        throw err;
    }
}

// ================== TOGGLE ==================

export async function toggleDivision(id) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}/toggle`);
        return data;
    } catch (err) {
        console.error("toggleDivision error:", err);
        throw err;
    }
}
