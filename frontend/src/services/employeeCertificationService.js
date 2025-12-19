import api from "./api";

const BASE_URL = "/employee-certifications";

export async function fetchCertifications(params = {}) {
    try {
        const { data } = await api.get(BASE_URL, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchCertifications error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function exportCertifications(params = {}) {
    try {
        const res = await api.get(`${BASE_URL}/export`, {
            params,
            responseType: "blob",
        });
        return res.data;
    } catch (err) {
        console.error("exportCertifications error:", err);
        throw err;
    }
}

export async function getCertificationDetail(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data;
    } catch (err) {
        console.error("getCertificationDetail error:", err);
        throw err;
    }
}

export async function createCertification(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("createCertification error:", err);
        throw err;
    }
}

export async function updateCertification(id, payload) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateCertification error:", err);
        throw err;
    }
}

export async function deleteCertification(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteCertification error:", err);
        throw err;
    }
}

export async function uploadCertificationFile(id, file, onUploadProgress) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const { data } = await api.post(`${BASE_URL}/${id}/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress,
        });
        return data;
    } catch (err) {
        console.error("uploadCertificationFile error:", err);
        throw err;
    }
}

export async function reuploadCertificationFile(id, file, onUploadProgress) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const { data } = await api.post(`${BASE_URL}/${id}/reupload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress,
        });
        return data;
    } catch (err) {
        console.error("reuploadCertificationFile error:", err);
        throw err;
    }
}

export async function deleteCertificationFile(id) {
    try {
        await api.delete(`${BASE_URL}/${id}/certificate`);
        return true;
    } catch (err) {
        console.error("deleteCertificationFile error:", err);
        throw err;
    }
}

export async function viewCertificationFile(id) {
    try {
        const res = await api.get(`${BASE_URL}/${id}/file`, {
            responseType: "blob",
        });
        return res.data;
    } catch (err) {
        console.error("viewCertificationFile error:", err);
        throw err;
    }
}

export async function downloadCertificationFile(id) {
    try {
        const res = await api.get(`${BASE_URL}/${id}/file`, {
            responseType: "blob",
            params: { download: true },
        });
        return res.data;
    } catch (err) {
        console.error("downloadCertificationFile error:", err);
        throw err;
    }
}
