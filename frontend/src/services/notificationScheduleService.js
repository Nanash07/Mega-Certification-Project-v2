import api from "./api";
const BASE_URL = "/notification-schedules";

export async function fetchAllSchedules() {
    try {
        const { data } = await api.get(BASE_URL);
        return data;
    } catch (error) {
        console.error("[NotificationSchedule] Gagal mengambil daftar jadwal:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal memuat jadwal notifikasi");
    }
}

export async function fetchScheduleByType(type) {
    try {
        const { data } = await api.get(`${BASE_URL}/${type}`);
        return data;
    } catch (error) {
        console.error(`[NotificationSchedule] Gagal mengambil jadwal ${type}:`, error.response?.data || error.message);
        throw new Error(error.response?.data || `Gagal memuat jadwal ${type}`);
    }
}

export async function updateSchedule(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (error) {
        console.error("[NotificationSchedule] Gagal menyimpan jadwal:", error.response?.data || error.message);
        throw new Error(error.response?.data || "Gagal memperbarui jadwal notifikasi");
    }
}

export async function runScheduleNow(type) {
    try {
        await api.post(`${BASE_URL}/run-now/${type}`);
        return true;
    } catch (error) {
        console.error(
            `[NotificationSchedule] Gagal menjalankan manual ${type}:`,
            error.response?.data || error.message
        );
        throw new Error(error.response?.data || "Gagal menjalankan notifikasi manual");
    }
}
