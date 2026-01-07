import api from "./api";

const BASE_URL = "/notification-templates";

// ================== FETCH DATA ==================

export async function fetchAllTemplates() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchAllTemplates error:", err);
        return [];
    }
}

export async function fetchTemplateByCode(code) {
    try {
        const { data } = await api.get(`${BASE_URL}/${code}`);
        return data || null;
    } catch (err) {
        console.error("fetchTemplateByCode error:", err);
        return null;
    }
}

// ================== UPDATE ==================

export async function updateTemplate(id, payload) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateTemplate error:", err);
        throw err;
    }
}
