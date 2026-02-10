import api from "./api";

const BASE_URL = "/job-certification-mappings";

// ================== FETCH DATA ==================

export async function fetchJobCertificationMappingsPaged(params = {}) {
    try {
        const { data } = await api.get(`${BASE_URL}/paged`, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchJobCertificationMappingsPaged error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchJobCertificationMappingById(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchJobCertificationMappingById error:", err);
        return null;
    }
}

// ================== CREATE / UPDATE ==================

export async function createJobCertificationMapping(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("createJobCertificationMapping error:", err);
        throw err;
    }
}

export async function updateJobCertificationMapping(id, payload) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateJobCertificationMapping error:", err);
        throw err;
    }
}

// ================== TOGGLE / DELETE ==================

export async function toggleJobCertificationMapping(id) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}/toggle`);
        return data;
    } catch (err) {
        console.error("toggleJobCertificationMapping error:", err);
        throw err;
    }
}

export async function deleteJobCertificationMapping(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteJobCertificationMapping error:", err);
        throw err;
    }
}

// ================== FILTER OPTIONS (Distinct) ==================

export async function fetchDistinctJobs(params = {}) {
    try {
        const { data } = await api.get(`${BASE_URL}/options/jobs`, { params });
        return data; // returns { content: [...], totalPages: ... }
    } catch (err) {
        return { content: [] };
    }
}

export async function fetchDistinctCertifications(params = {}) {
    try {
        const { data } = await api.get(`${BASE_URL}/options/certifications`, { params });
        return data;
    } catch (err) {
        return { content: [] };
    }
}

export async function fetchDistinctLevels(params = {}) {
    try {
        const { data } = await api.get(`${BASE_URL}/options/levels`, { params });
        return data;
    } catch (err) {
        return { content: [] };
    }
}

export async function fetchDistinctSubFields(params = {}) {
    try {
        const { data } = await api.get(`${BASE_URL}/options/sub-fields`, { params });
        return data;
    } catch (err) {
        return { content: [] };
    }
}
