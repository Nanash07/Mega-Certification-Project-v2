// src/services/notificationTemplateService.js
import api from "./api"; // axios instance yang udah handle baseURL & JWT token

const BASE_URL = "/notification-templates";
// Controller @RequestMapping("/api/notification-templates")

/**
 * 🔹 Ambil semua template notifikasi
 * GET /api/notification-templates
 */
export async function fetchAllTemplates() {
    try {
        const { data } = await api.get(BASE_URL);
        return data;
    } catch (error) {
        console.error("[NotificationTemplate] Gagal mengambil daftar template:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal memuat template notifikasi");
    }
}

/**
 * 🔹 Ambil satu template berdasarkan code
 * GET /api/notification-templates/{code}
 */
export async function fetchTemplateByCode(code) {
    try {
        const { data } = await api.get(`${BASE_URL}/${code}`);
        return data;
    } catch (error) {
        console.error(
            `[NotificationTemplate] Gagal mengambil template ${code}:`,
            error.response?.data || error.message
        );
        throw new Error(error.response?.data || `Gagal memuat template ${code}`);
    }
}

/**
 * 🔹 Update template notifikasi
 * PUT /api/notification-templates/{id}
 */
export async function updateTemplate(id, payload) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, payload);
        return data;
    } catch (error) {
        console.error("[NotificationTemplate] Gagal mengupdate template:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal memperbarui template notifikasi");
    }
}
