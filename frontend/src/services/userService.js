import api from "./api";

const BASE_URL = "/users";

// ================== FETCH DATA ==================

// Ambil list user (paging + filter + search)
export async function fetchUsers({ page = 0, size = 10, roleId, isActive, q } = {}) {
    try {
        const params = { page, size };
        if (roleId) params.roleId = roleId;
        if (isActive !== undefined && isActive !== "all") params.isActive = isActive;
        if (q) params.q = q;

        const { data } = await api.get(BASE_URL, { params });
        return (
            data || {
                content: [],
                totalPages: 0,
                totalElements: 0,
                size,
                number: page,
            }
        );
    } catch (err) {
        console.error("fetchUsers error:", err);
        return {
            content: [],
            totalPages: 0,
            totalElements: 0,
            size,
            number: page,
        };
    }
}

// Ambil detail user by ID
export async function fetchUserById(id) {
    try {
        const { data } = await api.get(`${BASE_URL}/${id}`);
        return data || null;
    } catch (err) {
        console.error("fetchUserById error:", err);
        return null;
    }
}

// ================== CREATE / UPDATE ==================

// Create user baru
export async function createUser(payload) {
    try {
        const { data } = await api.post(BASE_URL, payload);
        return data;
    } catch (err) {
        console.error("createUser error:", err);
        throw err;
    }
}

// Update user
export async function updateUser(id, payload) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}`, payload);
        return data;
    } catch (err) {
        console.error("updateUser error:", err);
        throw err;
    }
}

// ================== DELETE & TOGGLE ==================

// Soft delete user
export async function deleteUser(id) {
    try {
        await api.delete(`${BASE_URL}/${id}`);
        return true;
    } catch (err) {
        console.error("deleteUser error:", err);
        throw err;
    }
}

// Toggle aktif/nonaktif user
export async function toggleUser(id) {
    try {
        const { data } = await api.put(`${BASE_URL}/${id}/toggle`);
        return data;
    } catch (err) {
        console.error("toggleUser error:", err);
        throw err;
    }
}

// ================== DROPDOWNS / SELECT OPTIONS ==================

// Ambil semua user aktif (support query ?q= untuk search langsung ke backend)
export async function fetchActiveUsers(q = "") {
    try {
        const params = q ? { q } : {};
        const { data } = await api.get(`${BASE_URL}/active`, { params });
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("fetchActiveUsers error:", err);
        return [];
    }
}

// Format siap pakai untuk React Select
export async function fetchUserSelectOptions(q = "") {
    try {
        const users = await fetchActiveUsers(q);
        return users.map((u) => ({
            value: u.id,
            label: `${u.username}${u.employeeName ? ` - ${u.employeeName}` : ""}`,
        }));
    } catch (err) {
        console.error("fetchUserSelectOptions error:", err);
        return [];
    }
}
