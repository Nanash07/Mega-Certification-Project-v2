import api from "./api";

const BASE_URL = "/certifications";

// ================== HELPERS ==================

function serialize(body) {
    return {
        name: (body.name || "").trim(),
        code: (body.code || "").trim(),
        isWajib6bln: !!body.isWajib6bln,
        masaBerlaku: Number(body.masaBerlaku ?? 0),
        reminderMonth: Number(body.reminderMonth ?? 0),
    };
}

// ================== FETCH DATA ==================

export async function fetchCertifications() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : data?.content || [];
    } catch (err) {
        console.error("fetchCertifications error:", err);
        return [];
    }
}

export async function fetchCertification(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchCertification error:", err);
        return null;
    }
}

// ================== CREATE / UPDATE ==================

export async function createCertification(body) {
    try {
        const { data } = await api.post(BASE_URL, serialize(body));
        return data;
    } catch (err) {
        console.error("createCertification error:", err);
        throw err;
    }
}

export async function updateCertification(id, body) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, serialize(body));
        return data;
    } catch (err) {
        console.error("updateCertification error:", err);
        throw err;
    }
}

// ================== DELETE ==================

export async function deleteCertification(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteCertification error:", err);
        throw err;
    }
}
