import api from "./api";

const BASE_URL = "/roles";

// ================== FETCH DATA ==================

export async function fetchRoles() {
    try {
        const { data } = await api.get(BASE_URL);
        if (Array.isArray(data)) return data;
        if (data?.content && Array.isArray(data.content)) return data.content;
        return [];
    } catch (err) {
        console.error("fetchRoles error:", err);
        return [];
    }
}

// ================== CREATE / UPDATE ==================

export async function createRole(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("createRole error:", err);
        throw err;
    }
}

export async function updateRole(id, payload) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateRole error:", err);
        throw err;
    }
}

// ================== DELETE ==================

export async function deleteRole(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteRole error:", err);
        throw err;
    }
}
