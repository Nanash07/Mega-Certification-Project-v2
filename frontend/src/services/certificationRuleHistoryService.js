import api from "./api"; // pastikan file api.js export axios instance

const BASE_URL = "/certification-rule-histories"; // 🔹 tambahin /api kalau backend route pakai prefix

// 🔹 Ambil histori dengan paging + filter
export async function fetchCertificationRuleHistories(params = {}) {
    try {
        const { data } = await api.get(BASE_URL, { params });
        return {
            content: data.content || [],
            totalPages: data.totalPages || 0,
            totalElements: data.totalElements || 0,
            number: data.number || 0, // page index
            size: data.size || 0,
        };
    } catch (err) {
        console.error("fetchCertificationRuleHistories error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}
