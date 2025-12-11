// src/services/employeeEligibilityService.js
import api from "./api";

const BASE = "/employee-eligibility";

/* ===== util: current employeeId (sinkron sama ProtectedRoute) ===== */
function getCurrentEmployeeId() {
    if (typeof window === "undefined") return null;

    try {
        const rawUser = window.localStorage.getItem("user");
        if (rawUser) {
            const user = JSON.parse(rawUser);
            const cand = user?.employeeId ?? user?.employee?.id ?? null;
            if (cand != null && !Number.isNaN(Number(cand))) {
                const num = Number(cand);
                // cache biar next time gak perlu parse user lagi
                window.localStorage.setItem("employeeId", String(num));
                return num;
            }
        }
    } catch {
        // ignore parsing error, fallback ke key employeeId
    }

    const raw = typeof window !== "undefined" ? window.localStorage.getItem("employeeId") : null;

    if (raw == null || raw === "") return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
}

/* ===== helper build query params (paged) ===== */
function buildParams(params = {}) {
    const q = {};
    const set = (k, v) => {
        if (v === undefined || v === null || v === "") return;
        q[k] = Array.isArray(v) ? v.join(",") : v;
    };

    // paging
    set("page", params.page);
    set("size", params.size);

    // filters (list)
    set("employeeIds", params.employeeIds);
    set("jobIds", params.jobIds);
    set("certCodes", params.certCodes);
    set("levels", params.levels);
    set("subCodes", params.subCodes);
    set("statuses", params.statuses);
    set("sources", params.sources);
    set("search", params.search);

    // dashboard filters (org & cert dim)
    set("regionalId", params.regionalId);
    set("divisionId", params.divisionId);
    set("unitId", params.unitId);
    set("certificationId", params.certificationId);
    set("levelId", params.levelId);
    set("subFieldId", params.subFieldId);

    // sort
    if (params.sortField) {
        q.sort = `${params.sortField},${params.sortDirection || "asc"}`;
    }
    return q;
}

/* ===== paged generic (bisa PIC / admin / personal tergantung params) ===== */
export async function fetchEmployeeEligibilityPaged(params = {}) {
    try {
        const { data } = await api.get(`${BASE}/paged`, {
            params: buildParams(params),
        });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchEmployeeEligibilityPaged:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

/* ===== paged khusus pegawai login ===== */
export async function fetchMyEligibilityPaged({ page = 0, size = 10, statuses, sortField, sortDirection } = {}) {
    const employeeId = getCurrentEmployeeId();
    if (!employeeId) {
        return { content: [], totalPages: 0, totalElements: 0 };
    }

    return fetchEmployeeEligibilityPaged({
        employeeIds: [employeeId], // 🔹 scope ke pegawai login
        statuses,
        page,
        size,
        sortField,
        sortDirection,
    });
}

/* ===== detail by employee (tanpa paging) ===== */
export async function fetchEligibilityByEmployee(employeeId) {
    try {
        const { data } = await api.get(`${BASE}/employee/${employeeId}`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEligibilityByEmployee:", err);
        return [];
    }
}

/* ===== refresh (admin ops) ===== */
export async function refreshEmployeeEligibility() {
    try {
        await api.post(`${BASE}/refresh`);
        return true;
    } catch (err) {
        console.error("refreshEmployeeEligibility:", err);
        throw err;
    }
}

/* ===== counts untuk dashboard (sudah dukung scope pegawai) ===== */
export async function fetchEligibilityCount(params = {}) {
    try {
        const q = {
            // BE: status single string → nanti di-controller di-wrap ke List<String>
            status: params.status, // ACTIVE, DUE, EXPIRED, NOT_YET_CERTIFIED
            regionalId: params.regionalId,
            divisionId: params.divisionId,
            unitId: params.unitId,
            certificationId: params.certificationId,
            levelId: params.levelId,
            subFieldId: params.subFieldId,
        };

        // 🔹 scope ke pegawai (bisa list, bisa single)
        if (params.employeeIds?.length) {
            q.employeeIds = params.employeeIds.join(",");
        } else if (params.employeeId) {
            q.employeeIds = String(params.employeeId);
        }

        const { data } = await api.get(`${BASE}/count`, { params: q });
        return Number(data?.count ?? 0);
    } catch (err) {
        console.error("fetchEligibilityCount error:", err);
        return 0;
    }
}

/* ===== shorthand: count untuk pegawai login ===== */
export async function fetchMyEligibilityCount(status) {
    const employeeId = getCurrentEmployeeId();
    if (!employeeId) return 0;
    return fetchEligibilityCount({ employeeId, status });
}

/* (opsional) export util kalau mau dipakai di tempat lain */
export { getCurrentEmployeeId };
