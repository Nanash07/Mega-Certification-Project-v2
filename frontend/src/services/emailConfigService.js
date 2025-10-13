// src/services/emailConfigService.js
import api from "./api";

const BASE_URL = "/email-config"; // ✅ Backend prefix sesuai controller @RequestMapping("/api/email-config")

/**
 * 🔹 Ambil konfigurasi email aktif
 * GET /api/email-config/active
 */
export async function fetchActiveEmailConfig() {
    try {
        const { data } = await api.get(`${BASE_URL}/active`);
        return data;
    } catch (error) {
        console.error("[EmailConfig] Gagal mengambil konfigurasi aktif:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal mengambil konfigurasi email aktif");
    }
}

/**
 * 🔹 Ambil semua konfigurasi email (opsional, buat admin list)
 * GET /api/email-config
 */
export async function fetchAllEmailConfigs() {
    try {
        const { data } = await api.get(BASE_URL);
        return data;
    } catch (error) {
        console.error("[EmailConfig] Gagal mengambil semua konfigurasi:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal mengambil daftar konfigurasi email");
    }
}

/**
 * 🔹 Simpan / update konfigurasi email baru
 * POST /api/email-config
 */
export async function createEmailConfig(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (error) {
        console.error("[EmailConfig] Gagal menyimpan konfigurasi:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal menyimpan konfigurasi email");
    }
}

/**
 * 🔹 Kirim test email (cek koneksi SMTP)
 * POST /api/email-config/test?to=email@example.com
 */
export async function testEmailConnection(to) {
    try {
        const { data } = await api.post(`${BASE_URL}/test`, null, { params: { to } });
        return data; // response string seperti "Test email berhasil dikirim ke ..."
    } catch (error) {
        console.error("[EmailConfig] Gagal mengirim email test:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal mengirim test email");
    }
}
