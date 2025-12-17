import api from "./api";

// Ambil semua division (paged)
export async function fetchDivisions(params) {
    const res = await api.get("/divisions", { params });
    return res.data; // { content, totalPages, totalElements, ... }
}

// Ambil detail division by id
export async function fetchDivisionById(id) {
    const res = await api.get(`/divisions/${id}`);
    return res.data;
}

// Create division baru
export async function createDivision(name) {
    const res = await api.post("/divisions", null, {
        params: { name },
    });
    return res.data;
}

// Toggle aktif/nonaktif division
export async function toggleDivision(id) {
    const res = await api.put(`/divisions/${id}/toggle`);
    return res.data;
}
