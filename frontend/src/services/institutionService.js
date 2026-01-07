import api from "./api";

const BASE_URL = "/institutions";

// ================== HELPERS ==================

function serialize(body) {
    return {
        name: (body.name || "").trim(),
        type: (body.type || "").trim(),
        address: (body.address || "").trim(),
        contactPerson: (body.contactPerson || "").trim(),
    };
}

// ================== FETCH DATA ==================

export async function fetchInstitutions() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchInstitutions error:", err);
        return [];
    }
}

export async function fetchInstitution(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchInstitution error:", err);
        return null;
    }
}

// ================== CREATE / UPDATE ==================

export async function createInstitution(body) {
    try {
        const { data } = await api.post(BASE_URL, serialize(body));
        return data;
    } catch (err) {
        console.error("createInstitution error:", err);
        throw err;
    }
}

export async function updateInstitution(id, body) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, serialize(body));
        return data;
    } catch (err) {
        console.error("updateInstitution error:", err);
        throw err;
    }
}

// ================== DELETE ==================

export async function deleteInstitution(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteInstitution error:", err);
        throw err;
    }
}