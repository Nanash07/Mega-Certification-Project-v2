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

export async function exportEmployeeHistoriesExcel(params = {}) {
    try {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== "")
        );

        const res = await api.get(`${BASE_URL}/export`, {
            params: cleanParams,
            responseType: "blob",
        });

        const blob = new Blob([res.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        let filename = "employee_histories.xlsx";
        const cd = res.headers?.["content-disposition"];
        if (cd) {
            const m = cd.match(/filename="([^"]+)"/);
            if (m?.[1]) filename = m[1];
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        return true;
    } catch (err) {
        console.error("exportEmployeeHistoriesExcel error:", err?.response?.data || err);
        throw err;
    }
}

export async function fetchDefaultEmployeeOptionsFromHistories() {
    const data = await fetchEmployeeHistories({
        page: 0,
        size: 10,
        actionType: "all",
    });

    const unique = new Map();
    (data.content || []).forEach((h) => {
        if (h?.employeeId && !unique.has(h.employeeId)) {
            unique.set(h.employeeId, {
                value: h.employeeId,
                label: `${h.employeeNip || "-"} - ${h.employeeName || "-"}`,
            });
        }
    });

    return Array.from(unique.values()).slice(0, 10);
}

// ✅ INI YANG KURANG (buat search AsyncSelect)
export async function searchEmployeeOptionsFromHistories(keyword) {
    const q = (keyword ?? "").trim();
    if (q.length < 3) return [];

    const data = await fetchEmployeeHistories({
        page: 0,
        size: 10,
        search: q,
        actionType: "all",
    });

    const unique = new Map();
    (data.content || []).forEach((h) => {
        if (h?.employeeId && !unique.has(h.employeeId)) {
            unique.set(h.employeeId, {
                value: h.employeeId,
                label: `${h.employeeNip || "-"} - ${h.employeeName || "-"}`,
            });
        }
    });

    return Array.from(unique.values()).slice(0, 10);
}
