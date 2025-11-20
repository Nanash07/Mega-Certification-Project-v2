import api from "./api";

const BASE_URL = "/job-positions";

// Ambil job positions (paged/table)
export async function fetchJobPositions(params) {
    try {
        const res = await api.get(BASE_URL, { params });
        return res.data; // { content, totalPages, totalElements, size, number }
    } catch (err) {
        console.error("fetchJobPositions error:", err);
        return {
            content: [],
            totalPages: 0,
            totalElements: 0,
            size: params?.size || 10,
            number: params?.page || 0,
        };
    }
}

// Ambil semua job positions (dropdown)
export async function fetchAllJobPositions() {
    try {
        const res = await api.get(`${BASE_URL}/all`);
        return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
        console.error("fetchAllJobPositions error:", err);
        return [];
    }
}

// Detail by ID
export async function fetchJobPositionById(id) {
    try {
        const res = await api.get(`${BASE_URL}/${id}`);
        return res.data;
    } catch (err) {
        console.error("fetchJobPositionById error:", err);
        return null;
    }
}

// Create job position baru
export async function createJobPosition(payload) {
    try {
        const res = await api.post(BASE_URL, payload);
        return res.data;
    } catch (err) {
        console.error("createJobPosition error:", err);
        throw err;
    }
}

// Toggle aktif/nonaktif
export async function toggleJobPosition(id) {
    try {
        const res = await api.put(`${BASE_URL}/${id}/toggle`);
        return res.data;
    } catch (err) {
        console.error("toggleJobPosition error:", err);
        throw err;
    }
}
