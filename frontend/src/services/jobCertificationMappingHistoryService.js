// src/services/jobCertificationMappingHistoryService.js
import api from "./api";

const BASE_URL = "/job-certification-mapping-histories";
// pastiin backend lo punya endpoint: GET /api/job-certification-mapping-histories

// 🔹 Ambil histori Job Certification Mapping (paging + filter)
export async function fetchJobCertMappingHistories(params = {}) {
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
        console.error("❌ fetchJobCertMappingHistories error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}
