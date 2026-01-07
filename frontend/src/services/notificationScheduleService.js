import api from "./api";

const BASE_URL = "/notification-schedules";

// ================== FETCH DATA ==================

export async function fetchAllSchedules() {
    try {
        const { data } = await api.get(BASE_URL);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchAllSchedules error:", err);
        return [];
    }
}

export async function fetchScheduleByType(type) {
    try {
        const { data } = await api.get(`${BASE_URL}/${type}`);
        return data || null;
    } catch (err) {
        console.error("fetchScheduleByType error:", err);
        return null;
    }
}

// ================== UPDATE ==================

export async function updateSchedule(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("updateSchedule error:", err);
        throw err;
    }
}

// ================== RUN ==================

export async function runScheduleNow(type) {
    try {
        await api.post(`${BASE_URL}/run-now/${type}`);
        return true;
    } catch (err) {
        console.error("runScheduleNow error:", err);
        throw err;
    }
}
