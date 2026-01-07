import api from "./api";

const BASE_URL = "/notifications";

// ================== FETCH DATA ==================

export async function fetchNotificationsPaged(params = {}) {
    try {
        const { data } = await api.get(`${BASE_URL}/filter`, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchNotificationsPaged error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchSentNotificationsPaged(params = {}) {
    try {
        const { data } = await api.get(`${BASE_URL}/sent/filter`, { params });
        return data || { content: [], totalPages: 0, totalElements: 0 };
    } catch (err) {
        console.error("fetchSentNotificationsPaged error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchUnreadCount() {
    try {
        const { data } = await api.get(`${BASE_URL}/unread-count`);
        return data || 0;
    } catch (err) {
        console.error("fetchUnreadCount error:", err);
        return 0;
    }
}

export async function fetchLatestNotifications(limit = 5) {
    try {
        const { data } = await api.get(`${BASE_URL}/latest`, { params: { limit } });
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchLatestNotifications error:", err);
        return [];
    }
}

// ================== UPDATE ==================

export async function markNotificationAsRead(id) {
    try {
        await api.patch(`${BASE_URL}/${id}/read`);
        return true;
    } catch (err) {
        console.error("markNotificationAsRead error:", err);
        throw err;
    }
}
