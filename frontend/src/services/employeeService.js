import api from "./api";

const EMPLOYEE_BASE = "/employees";
const IMPORT_BASE = "/employees/import";

// ========== EMPLOYEE CRUD ==========

// list active (paged + filter + sort)
export async function fetchEmployees(params = {}) {
    try {
        const query = { ...params };

        if (params?.sortField) {
            query.sort = `${params.sortField},${params.sortDirection || "asc"}`;
            delete query.sortField;
            delete query.sortDirection;
        }

        const { data } = await api.get(`${EMPLOYEE_BASE}/paged`, { params: query });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchEmployees error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

// list resigned (paged + filter + sort)
export async function fetchResignedEmployees(params = {}) {
    try {
        const query = { ...params };

        if (params?.sortField) {
            query.sort = `${params.sortField},${params.sortDirection || "asc"}`;
            delete query.sortField;
            delete query.sortDirection;
        }

        const { data } = await api.get(`${EMPLOYEE_BASE}/resigned/paged`, { params: query });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchResignedEmployees error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

// all active (dropdown)
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
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("searchEmployees error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

// simple search resigned (paged)
export async function searchResignedEmployees({ search = "", page = 0, size = 20 }) {
    try {
        const { data } = await api.get(`${EMPLOYEE_BASE}/resigned/paged`, {
            params: { search, page, size },
        });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("searchResignedEmployees error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
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

// soft delete (mark resigned)
export async function deleteEmployee(id) {
    try {
        await api.delete(`${EMPLOYEE_BASE}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteEmployee error:", err);
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
        const res = await api.get(`${IMPORT_BASE}/template`, {
            responseType: "blob",
        });
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
