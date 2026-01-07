import api from "./api";

const BASE_URL = "/refreshment-types";

// ================== FETCH DATA ==================

export async function fetchRefreshmentTypes() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchRefreshmentTypes error:", err);
        return [];
    }
}

// ================== CREATE / UPDATE ==================

export async function createRefreshmentType(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("createRefreshmentType error:", err);
        throw err;
    }
}

export async function updateRefreshmentType(id, payload) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateRefreshmentType error:", err);
        throw err;
    }
}

// ================== DELETE ==================

export async function deleteRefreshmentType(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteRefreshmentType error:", err);
        throw err;
    }
}
