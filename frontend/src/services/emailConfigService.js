import api from "./api";

const BASE_URL = "/email-config"; // backend prefix

export async function fetchActiveEmailConfig() {
    try {
        const { data } = await api.get(`${BASE_URL}/active`);
        return data;
    } catch (error) {
        console.error("[EmailConfig] gagal ambil config aktif:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal mengambil konfigurasi email aktif");
    }
}

export async function fetchAllEmailConfigs() {
    try {
        const { data } = await api.get(BASE_URL);
        return data;
    } catch (error) {
        console.error("[EmailConfig] gagal ambil semua config:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal mengambil daftar konfigurasi email");
    }
}

export async function createEmailConfig(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (error) {
        console.error("[EmailConfig] gagal simpan config:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal menyimpan konfigurasi email");
    }
}

export async function testEmailConnection(email, subject, message) {
    try {
        const { data } = await api.post("/email-config/test", { email, subject, message });
        return data;
    } catch (error) {
        throw new Error(error.response?.data || "Gagal mengirim test email");
    }
}
