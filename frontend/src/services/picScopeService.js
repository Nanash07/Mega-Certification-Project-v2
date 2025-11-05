// src/services/picScopeService.js
import api from "./api";

export async function fetchPicScopes() {
    const { data } = await api.get("/pic-scope");
    return Array.isArray(data) ? data : [];
}

export async function fetchPicScopesByUser(userId) {
    const { data } = await api.get(`/pic-scope/${userId}`);
    return data;
}

// ✅ BARU — scope milik PIC yang login
export async function fetchMyPicScope() {
    const { data } = await api.get("/pic-scope/me");
    return data; // { userId, certifications: [{ certificationId, certificationCode }, ...] }
}

export async function assignPicScope(userId, certificationIds) {
    const { data } = await api.put(`/pic-scope/${userId}`, { certificationIds });
    return data;
}
