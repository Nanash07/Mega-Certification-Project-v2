// src/services/employeeCertificationHistoryService.js
import api from "./api";

const BASE_URL = "/api/employee-certification-histories";
// 🔹 pastikan prefix /api sesuai backend lo

// Ambil histori pegawai dengan paging + filter
export async function fetchEmployeeCertificationHistories(params = {}) {
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
        console.error("fetchEmployeeCertificationHistories error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}
