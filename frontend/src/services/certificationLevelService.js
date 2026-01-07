import api from "./api";

const BASE_URL = "/certification-levels";

// ================== HELPERS ==================

function serialize(body) {
    return {
        certificationId: Number(body.certificationId ?? 0),
        level: Number(body.level ?? 0),
        name: (body.name || "").trim(),
    };
}

// ================== FETCH DATA ==================

export async function fetchCertificationLevels() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : data?.content || [];
    } catch (err) {
        console.error("fetchCertificationLevels error:", err);
        return [];
    }
}

export async function fetchCertificationLevel(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchCertificationLevel error:", err);
        return null;
    }
}

// ================== CREATE / UPDATE ==================

export async function createCertificationLevel(body) {
    try {
        const { data } = await api.post(BASE_URL, serialize(body));
        return data;
    } catch (err) {
        console.error("createCertificationLevel error:", err);
        throw err;
    }
}

export async function updateCertificationLevel(id, body) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, serialize(body));
        return data;
    } catch (err) {
        console.error("updateCertificationLevel error:", err);
        throw err;
    }
}

// ================== DELETE ==================

export async function deleteCertificationLevel(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteCertificationLevel error:", err);
        throw err;
    }
}