import api from "./api";

const BASE = "/employee-batches";

// tanpa paging
export async function fetchEmployeeBatches(batchId) {
    try {
        const { data } = await api.get(`${BASE}/batch/${batchId}`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEmployeeBatches error:", err);
        return [];
    }
}

// dengan paging + filter org
export async function fetchEmployeeBatchesPaged({
    batchId,
    page = 0,
    size = 10,
    search,
    status,
    regional,
    division,
    unit,
    job,
}) {
    try {
        const params = { page, size };
        if (search) params.search = search;
        if (status) params.status = status;
        if (regional) params.regional = regional;
        if (division) params.division = division;
        if (unit) params.unit = unit;
        if (job) params.job = job;

        const { data } = await api.get(`${BASE}/batch/${batchId}/paged`, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchEmployeeBatchesPaged error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

// tambah peserta single
export async function addEmployeeToBatch(batchId, employeeId) {
    try {
        const { data } = await api.post(`${BASE}/batch/${batchId}/employee/${employeeId}`);
        return data;
    } catch (err) {
        console.error("addEmployeeToBatch error:", err);
        throw err;
    }
}

// tambah peserta bulk
export async function addEmployeesToBatchBulk(batchId, employeeIds = []) {
    try {
        const { data } = await api.post(`${BASE}/batch/${batchId}/employees/bulk`, employeeIds);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("addEmployeesToBatchBulk error:", err);
        throw err;
    }
}

// update status via @RequestParam (BE: PUT /{id}/status)
export async function updateEmployeeBatchStatus(id, status, score, notes) {
    try {
        const params = {};
        if (status != null) params.status = status; // REGISTERED/ATTENDED/PASSED/FAILED
        if (score != null) params.score = score; // optional
        if (notes != null) params.notes = notes; // optional

        const { data } = await api.put(`${BASE}/${id}/status`, null, { params });
        return data;
    } catch (err) {
        console.error("updateEmployeeBatchStatus error:", err);
        throw err;
    }
}

// retry FAILED -> REGISTERED
export async function retryEmployeeBatch(id) {
    try {
        const { data } = await api.patch(`${BASE}/${id}/retry`);
        return data;
    } catch (err) {
        console.error("retryEmployeeBatch error:", err);
        throw err;
    }
}

// hapus peserta (REGISTERED only)
export async function deleteEmployeeFromBatch(id) {
    try {
        await api.delete(`${BASE}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteEmployeeFromBatch error:", err);
        throw err;
    }
}

// eligible list
export async function fetchEligibleEmployees(batchId) {
    try {
        const { data } = await api.get(`${BASE}/batch/${batchId}/eligible`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEligibleEmployees error:", err);
        return [];
    }
}
