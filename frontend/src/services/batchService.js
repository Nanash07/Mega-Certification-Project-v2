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
    set("batchIds", params.batchIds); // BE sekarang nggak pakai, tapi gak masalah kalau kepasang
    set("status", params.status);
    set("type", params.type);
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

// 🔹 Paging + Filter + Search (tabel list & dashboard)
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

// 🔹 Create batch
export async function createBatch(payload) {
    try {
        const { data } = await api.post(BASE, payload);
        return data;
    } catch (err) {
        console.error("createBatch error:", err);
        throw err;
    }
}

// 🔹 Update batch
export async function updateBatch(id, payload) {
    try {
        const { data } = await api.put(`${BASE}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateBatch error:", err);
        throw err;
    }
}

// 🔹 Delete batch (soft delete)
export async function deleteBatch(id) {
    try {
        await api.delete(`${BASE}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteBatch error:", err);
        return false;
    }
}

// 🔹 Search batch (async select di dropdown)
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

// 🔹 Get batch detail by ID
export async function fetchBatchById(id) {
    try {
        const { data } = await api.get(`${BASE}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchBatchById error:", err);
        return null;
    }
}

// 🔹 Kirim email notifikasi ke peserta batch
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

// 🔹 Batch berjalan khusus Pegawai (self dashboard)
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
