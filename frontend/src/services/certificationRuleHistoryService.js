import api from "./api";

const BASE_URL = "/certification-rule-histories";

// ================== FETCH DATA ==================

export async function fetchCertificationRuleHistories(params = {}) {
    try {
        const { data } = await api.get(BASE_URL, { params });
        return {
            content: data.content || [],
            totalPages: data.totalPages || 0,
            totalElements: data.totalElements || 0,
            number: data.number || 0,
            size: data.size || 0,
        };
    } catch (err) {
        console.error("fetchCertificationRuleHistories error:", err);
        return { content: [], totalPages: 0, totalElements: 0, number: 0, size: 0 };
    }
}
