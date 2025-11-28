// src/services/notificationService.js
import api from "./api";

const BASE_URL = "/notifications";

export async function fetchNotificationsPaged(params = {}) {
    try {
        const { data } = await api.get(`${BASE_URL}/filter`, {
            params,
        });
        return data;
    } catch (error) {
        console.error("[Notification] Error fetch paged:", error);
        throw error;
    }
}

export async function fetchUnreadCount() {
    try {
        const { data } = await api.get(`${BASE_URL}/unread-count`);
        return data;
    } catch (error) {
        console.error("[Notification] Error unread count:", error);
        throw error;
    }
}

export async function markNotificationAsRead(id) {
    try {
        await api.patch(`${BASE_URL}/${id}/read`);
        return true;
    } catch (error) {
        console.error("[Notification] mark read error:", error);
        throw error;
    }
}

export async function fetchLatestNotifications(limit = 5) {
    try {
        const { data } = await api.get(`${BASE_URL}/latest`, {
            params: { limit },
        });
        return data;
    } catch (error) {
        console.error("[Notification] Gagal mengambil notifikasi terbaru:", error);
        return [];
    }
}
