import api from "./api";

const BASE_URL = "/job-positions";

// ================== FETCH DATA ==================

export async function fetchJobPositions(params = {}) {
    try {
        const { data } = await api.get(BASE_URL, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchJobPositions error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchAllJobPositions() {
    try {
        const { data } = await api.get(`${BASE_URL}/all`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchAllJobPositions error:", err);
        return [];
    }
}

export async function fetchJobPositionById(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchJobPositionById error:", err);
        return null;
    }
}

// ================== CREATE ==================

export async function createJobPosition(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("createJobPosition error:", err);
        throw err;
    }
}

// ================== TOGGLE ==================

export async function toggleJobPosition(id) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}/toggle`);
        return data;
    } catch (err) {
        console.error("toggleJobPosition error:", err);
        throw err;
    }
}
