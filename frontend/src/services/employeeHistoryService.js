// src/services/employeeHistoryService.js
import api from "./api";

const BASE_URL = "/employee-histories";

export async function fetchEmployeeHistories(params = {}) {
    try {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== "")
        );

        const { data } = await api.get(BASE_URL, { params: cleanParams });

        return {
            content: data?.content ?? [],
            totalPages: data?.totalPages ?? 0,
            totalElements: data?.totalElements ?? 0,
            number: data?.number ?? 0,
            size: data?.size ?? 0,
        };
    } catch (err) {
        console.error("fetchEmployeeHistories error:", err?.response?.data || err);
        throw err;
    }
}
