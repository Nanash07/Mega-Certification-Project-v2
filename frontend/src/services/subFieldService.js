import api from "./api";

const BASE_URL = "/subfields";

// ================== FETCH DATA ==================

export async function fetchSubFields() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchSubFields error:", err);
        return [];
    }
}

// ================== CREATE / UPDATE ==================

export async function createSubField(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("createSubField error:", err);
        throw err;
    }
}

export async function updateSubField(id, payload) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateSubField error:", err);
        throw err;
    }
}

// ================== DELETE ==================

export async function deleteSubField(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteSubField error:", err);
        throw err;
    }
}