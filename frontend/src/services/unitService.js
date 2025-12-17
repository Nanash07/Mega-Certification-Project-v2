import api from "./api";

// Ambil semua unit (paged)
export async function fetchUnits(params) {
    const res = await api.get("/units", { params });
    return res.data; // { content, totalPages, totalElements, ... }
}

// Ambil detail unit by id
export async function fetchUnitById(id) {
    const res = await api.get(`/units/${id}`);
    return res.data;
}

// Create unit baru
export async function createUnit(name) {
    const res = await api.post("/units", null, {
        params: { name },
    });
    return res.data;
}

// Toggle aktif/nonaktif unit
export async function toggleUnit(id) {
    const res = await api.put(`/units/${id}/toggle`);
    return res.data;
}
