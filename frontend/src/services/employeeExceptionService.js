import api from "./api";

const BASE_URL = "/exceptions";
const IMPORT_BASE = `${BASE_URL}/import`;

export async function fetchExceptions(params = {}) {
    try {
        const { data } = await api.get(BASE_URL, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchExceptions error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function createException(payload) {
    const { data } = await api.post(BASE_URL, payload);
    return data;
}

export async function updateException(id, notes) {
    const { data } = await api.put(`${BASE_URL}/${id}/notes`, null, { params: { notes } });
    return data;
}

export async function toggleException(id) {
    const { data } = await api.put(`${BASE_URL}/${id}/toggle`);
    return data;
}

export async function deleteException(id) {
    await api.delete(`${BASE_URL}/${id}`);
    return true;
}

export async function dryRunImportExceptions(file) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`${IMPORT_BASE}/dry-run`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
}

export async function confirmImportExceptions(file) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`${IMPORT_BASE}/confirm`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
}

export async function downloadExceptionTemplate() {
    const res = await api.get(`${IMPORT_BASE}/template`, { responseType: "blob" });
    return res.data;
}

export async function exportExceptions(params = {}) {
    const res = await api.get(`${BASE_URL}/export`, {
        params,
        responseType: "blob",
    });
    return res.data;
}
