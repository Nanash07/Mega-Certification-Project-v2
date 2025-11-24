import api from "./api";

const BASE_URL = "/employee-eligibility";

// 🔹 Ambil data eligibility dengan paging + filter
export async function fetchEmployeeEligibilityPaged(params) {
    try {
        const { data } = await api.get(`${BASE_URL}/paged`, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchEmployeeEligibilityPaged error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

// 🔹 Ambil semua eligibility untuk 1 pegawai (buat detail page)
export async function fetchEligibilityByEmployee(employeeId) {
    try {
        const { data } = await api.get(`${BASE_URL}/employee/${employeeId}`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEligibilityByEmployee error:", err);
        return [];
    }
}

// 🔹 Refresh eligibility (recalculate semua eligibility)
export async function refreshEmployeeEligibility() {
    try {
        await api.post(`${BASE_URL}/refresh`);
        return true;
    } catch (err) {
        console.error("refreshEmployeeEligibility error:", err);
        throw err;
    }
}
