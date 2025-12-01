// src/services/employeeEligibilityService.js
import api from "./api";

const BASE = "/employee-eligibility";

function buildParams(params = {}) {
    const q = {};
    const set = (k, v) => {
        if (v === undefined || v === null || v === "") return;
        q[k] = Array.isArray(v) ? v.join(",") : v;
    };

    set("page", params.page);
    set("size", params.size);

    set("employeeIds", params.employeeIds);
    set("jobIds", params.jobIds);
    set("certCodes", params.certCodes);
    set("levels", params.levels);
    set("subCodes", params.subCodes);
    set("statuses", params.statuses);
    set("sources", params.sources);
    set("search", params.search);

    set("regionalId", params.regionalId);
    set("divisionId", params.divisionId);
    set("unitId", params.unitId);
    set("certificationId", params.certificationId);
    set("levelId", params.levelId);
    set("subFieldId", params.subFieldId);

    if (params.sortField) {
        q.sort = `${params.sortField},${params.sortDirection || "asc"}`;
    }
    return q;
}

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

export async function fetchEligibilityByEmployee(employeeId) {
    try {
        const { data } = await api.get(`${BASE}/employee/${employeeId}`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEligibilityByEmployee:", err);
        return [];
    }
}

export async function refreshEmployeeEligibility() {
    try {
        await api.post(`${BASE}/refresh`);
        return true;
    } catch (err) {
        console.error("refreshEmployeeEligibility:", err);
        throw err;
    }
}

/**
 * KPI untuk dashboard (pie chart) langsung dari employee_eligibility.
 * Endpoint: GET /employee-eligibility/dashboard-kpi
 */
export async function fetchEligibilityKpi(params = {}) {
    try {
        // Kirim cuma filter dashboard (tanpa paging / search)
        const q = buildParams({
            regionalId: params.regionalId,
            divisionId: params.divisionId,
            unitId: params.unitId,
            certificationId: params.certificationId,
            levelId: params.levelId,
            subFieldId: params.subFieldId,
        });

        const { data } = await api.get(`${BASE}/dashboard-kpi`, { params: q });
        const safe = data || {};

        return {
            active: Number(safe.active ?? 0),
            due: Number(safe.due ?? 0),
            expired: Number(safe.expired ?? 0),
            notYetCertified: Number(safe.notYetCertified ?? 0),
            eligibleTotal: Number(safe.eligibleTotal ?? 0),
        };
    } catch (err) {
        console.error("fetchEligibilityKpi:", err);
        return {
            active: 0,
            due: 0,
            expired: 0,
            notYetCertified: 0,
            eligibleTotal: 0,
        };
    }
}
