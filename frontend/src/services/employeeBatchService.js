// src/services/employeeBatchService.js
import api from "./api";

const BASE = "/employee-batches";

// Get peserta by batch (tanpa paging → return array)
export async function fetchEmployeeBatches(batchId) {
    try {
        const { data } = await api.get(`${BASE}/batch/${batchId}`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEmployeeBatches error:", err);
        return [];
    }
}

// Get peserta by batch (with paging → return page object)
export async function fetchEmployeeBatchesPaged({ batchId, page = 0, size = 10, search, status }) {
    try {
        const params = { page, size };
        if (search) params.search = search;
        if (status) params.status = status;

        const { data } = await api.get(`${BASE}/batch/${batchId}/paged`, { params });
        return data; // { content, totalPages, totalElements, ... }
    } catch (err) {
        console.error("fetchEmployeeBatchesPaged error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

// Tambah peserta (single) - auto restore jika soft-deleted (handled by BE)
export async function addEmployeeToBatch(batchId, employeeId) {
    try {
        const { data } = await api.post(`${BASE}/batch/${batchId}/employee/${employeeId}`);
        return data;
    } catch (err) {
        console.error("addEmployeeToBatch error:", err);
        throw err;
    }
}

// Tambah peserta (bulk) - auto restore jika soft-deleted (handled by BE)
export async function addEmployeesToBatchBulk(batchId, employeeIds) {
    try {
        const { data } = await api.post(`${BASE}/batch/${batchId}/employees/bulk`, employeeIds);
        return data;
    } catch (err) {
        console.error("addEmployeesToBatchBulk error:", err);
        throw err;
    }
}

// Update status peserta
export async function updateEmployeeBatchStatus(id, status, score, notes) {
    try {
        const { data } = await api.put(`${BASE}/${id}/status`, null, {
            params: { status, score, notes },
        });
        return data;
    } catch (err) {
        console.error("updateEmployeeBatchStatus error:", err);
        throw err;
    }
}

// Retry peserta FAILED -> REGISTERED
export async function retryEmployeeBatch(id) {
    try {
        const { data } = await api.patch(`${BASE}/${id}/retry`);
        return data;
    } catch (err) {
        console.error("retryEmployeeBatch error:", err);
        throw err;
    }
}

// Delete peserta (hanya boleh REGISTERED - enforced by BE)
export async function deleteEmployeeFromBatch(id) {
    try {
        await api.delete(`${BASE}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteEmployeeFromBatch error:", err);
        throw err;
    }
}

// Get eligible employees untuk batch
export async function fetchEligibleEmployees(batchId) {
    try {
        const { data } = await api.get(`${BASE}/batch/${batchId}/eligible`);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchEligibleEmployees error:", err);
        return [];
    }
}
