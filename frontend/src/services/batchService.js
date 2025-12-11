// src/services/batchService.js
import api from "./api";

const BASE = "/batches";

/** helper: bersihin params dan serialize array ke comma-separated */
function buildParams(params = {}) {
    const q = {};
    const set = (k, v) => {
        if (v === undefined || v === null || v === "") return;
        if (Array.isArray(v)) q[k] = v.join(",");
        else q[k] = v;
    };

    // paging
    set("page", params.page);
    set("size", params.size);

    // filter umum
    set("batchIds", params.batchIds);
    set("status", params.status);

    // support param `type` dan juga alias `batchType` dari dashboard
    const resolvedType = params.type ?? params.batchType;
    set("type", resolvedType);

    set("certificationRuleId", params.certificationRuleId);
    set("institutionId", params.institutionId);
    set("search", params.search);

    // filter dashboard / organisasi / sertifikasi
    set("regionalId", params.regionalId);
    set("divisionId", params.divisionId);
    set("unitId", params.unitId);
    set("certificationId", params.certificationId);
    set("levelId", params.levelId);
    set("subFieldId", params.subFieldId);

    // 🔹 NEW: scope per-pegawai (dipakai EmployeeDashboard & bisa dipakai endpoint lain juga)
    set("employeeId", params.employeeId);

    // date range
    set("startDate", params.startDate);
    set("endDate", params.endDate);

    // sort: Spring format -> sort=field,direction
    if (params.sortField) {
        q.sort = `${params.sortField},${params.sortDirection || "asc"}`;
    }
    return q;
}

// ================== BATCH CRUD ==================
export async function fetchBatches(params = {}) {
    try {
        const { data } = await api.get(`${BASE}/paged`, { params: buildParams(params) });
        return (
            data || {
                content: [],
                totalPages: 0,
                totalElements: 0,
            }
        );
    } catch (err) {
        console.error("fetchBatches error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function createBatch(payload) {
    try {
        const { data } = await api.post(BASE, payload);
        return data;
    } catch (err) {
        console.error("createBatch error:", err);
        throw err;
    }
}

export async function updateBatch(id, payload) {
    try {
        const { data } = await api.put(`${BASE}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateBatch error:", err);
        throw err;
    }
}

export async function deleteBatch(id) {
    try {
        await api.delete(`${BASE}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteBatch error:", err);
        return false;
    }
}

export async function searchBatches({ search, page = 0, size = 20 } = {}) {
    try {
        const { data } = await api.get(`${BASE}/paged`, {
            params: buildParams({ search, page, size }),
        });
        return (
            data || {
                content: [],
                totalPages: 0,
                totalElements: 0,
            }
        );
    } catch (err) {
        console.error("searchBatches error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchBatchById(id) {
    try {
        const { data } = await api.get(`${BASE}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchBatchById error:", err);
        return null;
    }
}

export async function sendBatchNotifications(batchId, { status } = {}) {
    try {
        const { data } = await api.post(`/notifications/batches/${batchId}/send`, null, {
            params: status ? { status } : {},
        });
        return typeof data === "number" ? data : data?.sent ?? 0;
    } catch (err) {
        console.error("sendBatchNotifications error:", err);
        throw err;
    }
}

export async function fetchEmployeeOngoingBatchesPaged({ page = 0, size = 10 } = {}) {
    try {
        const { data } = await api.get(`${BASE}/employee/ongoing-paged`, {
            params: { page, size },
        });
        return (
            data || {
                content: [],
                totalPages: 0,
                totalElements: 0,
            }
        );
    } catch (err) {
        console.error("fetchEmployeeOngoingBatchesPaged error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

// tetap boleh dipakai di tempat lain (bulanannya masih global di BE, FE siapin param employeeId)
export async function fetchMonthlyBatches(params = {}) {
    try {
        const { data } = await api.get(`${BASE}/monthly`, {
            params,
        });
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchMonthlyBatches error:", err);
        return [];
    }
}

// ================== BATCH COUNT (DASHBOARD) ==================
export async function fetchBatchCount(params = {}) {
    try {
        const { data } = await api.get(`${BASE}/count`, {
            params: {
                status: params.status,
                type: params.type,
                regionalId: params.regionalId,
                divisionId: params.divisionId,
                unitId: params.unitId,
                certificationId: params.certificationId,
                levelId: params.levelId,
                subFieldId: params.subFieldId,
                employeeId: params.employeeId, // 🔹 NEW (optional; BE siapin byEmployee di service)
            },
        });
        return Number(data?.count ?? 0);
    } catch (err) {
        console.error("fetchBatchCount error:", err);
        return 0;
    }
}
