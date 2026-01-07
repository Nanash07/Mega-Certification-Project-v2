import api from "./api";

const BASE_URL = "/job-certification-mappings/import";

// ================== IMPORT ==================

export async function dryRunJobCertImport(file) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await api.post(`${BASE_URL}/dry-run`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
    } catch (err) {
        console.error("dryRunJobCertImport error:", err);
        throw err;
    }
}

export async function confirmJobCertImport(file) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await api.post(`${BASE_URL}/confirm`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
    } catch (err) {
        console.error("confirmJobCertImport error:", err);
        throw err;
    }
}

// ================== TEMPLATE ==================

export async function downloadJobCertTemplate() {
    try {
        const res = await api.get(`${BASE_URL}/template`, { responseType: "blob" });
        const blob = new Blob([res.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = "job_certification_mapping_template.xlsx";
        link.click();
    } catch (err) {
        console.error("downloadJobCertTemplate error:", err);
        throw err;
    }
}
