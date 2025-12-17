import api from "./api";

const EMPLOYEE_BASE = "/employees";
const IMPORT_BASE = "/employees/import";

// ========== EMPLOYEE LISTING ==========

function normalizePaged(data) {
    return data && typeof data === "object"
        ? {
              content: Array.isArray(data.content) ? data.content : [],
              totalPages: Number(data.totalPages ?? 0),
              totalElements: Number(data.totalElements ?? 0),
              number: Number(data.number ?? 0),
              size: Number(data.size ?? 0),
          }
        : { content: [], totalPages: 0, totalElements: 0, number: 0, size: 0 };
}

function buildSort(params) {
    const query = { ...params };
    if (query?.sortField) {
        query.sort = `${query.sortField},${query.sortDirection || "asc"}`;
        delete query.sortField;
        delete query.sortDirection;
    }
    return query;
}

// list active (paged + filter + sort) => backend already excludes RESIGN
export async function fetchEmployees(params = {}) {
    try {
        const query = buildSort(params);
        const { data } = await api.get(`${EMPLOYEE_BASE}/paged`, { params: query });
        return normalizePaged(data);
    } catch (err) {
        console.error("fetchEmployees error:", err);
        return normalizePaged(null);
    }
}

// list resigned (paged + filter + sort) => backend returns only RESIGN
export async function fetchResignedEmployees(params = {}) {
    try {
        const query = buildSort(params);
        const { data } = await api.get(`${EMPLOYEE_BASE}/resigned/paged`, { params: query });
        return normalizePaged(data);
    } catch (err) {
        console.error("fetchResignedEmployees error:", err);
        return normalizePaged(null);
    }
}

// all active (dropdown) => backend returns only non-resign active list
export async function fetchEmployeesAll() {
    try {
        const { data } = await api.get(`${EMPLOYEE_BASE}/all`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEmployeesAll error:", err);
        return [];
    }
}

// simple search active (paged)
export async function searchEmployees({ search = "", page = 0, size = 20 }) {
    try {
        const { data } = await api.get(`${EMPLOYEE_BASE}/paged`, {
            params: { search, page, size },
        });
        return normalizePaged(data);
    } catch (err) {
        console.error("searchEmployees error:", err);
        return normalizePaged(null);
    }
}

// simple search resigned (paged)
export async function searchResignedEmployees({ search = "", page = 0, size = 20 }) {
    try {
        const { data } = await api.get(`${EMPLOYEE_BASE}/resigned/paged`, {
            params: { search, page, size },
        });
        return normalizePaged(data);
    } catch (err) {
        console.error("searchResignedEmployees error:", err);
        return normalizePaged(null);
    }
}

// detail (active + resigned)
export async function getEmployeeDetail(id) {
    try {
        const { data } = await api.get(`${EMPLOYEE_BASE}/${id}`);
        return data;
    } catch (err) {
        console.error("getEmployeeDetail error:", err);
        throw err;
    }
}

// ========== ACTIONS ==========

// soft delete (hapus dari sistem)
export async function softDeleteEmployee(id) {
    try {
        await api.delete(`${EMPLOYEE_BASE}/${id}`);
        return true;
    } catch (err) {
        console.error("softDeleteEmployee error:", err);
        throw err;
    }
}

// resign (status change only)
export async function resignEmployee(id) {
    try {
        const { data } = await api.patch(`${EMPLOYEE_BASE}/${id}/resign`);
        return data;
    } catch (err) {
        console.error("resignEmployee error:", err);
        throw err;
    }
}

export async function createEmployee(payload) {
    try {
        const { data } = await api.post(EMPLOYEE_BASE, payload);
        return data;
    } catch (err) {
        console.error("createEmployee error:", err);
        throw err;
    }
}

export async function updateEmployee(id, payload) {
    try {
        const { data } = await api.put(`${EMPLOYEE_BASE}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateEmployee error:", err);
        throw err;
    }
}

// ========== EMPLOYEE IMPORT ==========

export async function downloadEmployeeTemplate() {
    try {
        const res = await api.get(`${IMPORT_BASE}/template`, { responseType: "blob" });
        return res.data;
    } catch (err) {
        console.error("downloadEmployeeTemplate error:", err);
        throw err;
    }
}

export async function importEmployeesDryRun(formData) {
    try {
        const { data } = await api.post(`${IMPORT_BASE}/dry-run`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
    } catch (err) {
        console.error("importEmployeesDryRun error:", err);
        throw err;
    }
}

export async function importEmployeesConfirm(formData) {
    try {
        const { data } = await api.post(`${IMPORT_BASE}/confirm`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
    } catch (err) {
        console.error("importEmployeesConfirm error:", err);
        throw err;
    }
}

export async function fetchEmployeeImportLogs() {
    try {
        const { data } = await api.get(`${IMPORT_BASE}/logs`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEmployeeImportLogs error:", err);
        return [];
    }
}

export async function fetchEmployeeImportLogsByUser(userId) {
    try {
        const { data } = await api.get(`${IMPORT_BASE}/logs/${userId}`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEmployeeImportLogsByUser error:", err);
        return [];
    }
}

// ========== MASTER DATA (dropdown) ==========

export async function fetchRegionals() {
    try {
        const { data } = await api.get("/regionals/all");
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchRegionals error:", err);
        return [];
    }
}

export async function fetchDivisions() {
    try {
        const { data } = await api.get("/divisions/all");
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchDivisions error:", err);
        return [];
    }
}

export async function fetchUnits() {
    try {
        const { data } = await api.get("/units/all");
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchUnits error:", err);
        return [];
    }
}

export async function fetchJobPositions() {
    try {
        const { data } = await api.get("/job-positions/all");
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchJobPositions error:", err);
        return [];
    }
}

// ================== EMPLOYEE COUNT (DASHBOARD) ==================
export async function fetchEmployeeCount(params = {}) {
    try {
        const { data } = await api.get(`${EMPLOYEE_BASE}/count`, {
            params: {
                regionalId: params.regionalId,
                divisionId: params.divisionId,
                unitId: params.unitId,
            },
        });
        return Number(data?.count ?? 0);
    } catch (err) {
        console.error("fetchEmployeeCount error:", err);
        return 0;
    }
}
