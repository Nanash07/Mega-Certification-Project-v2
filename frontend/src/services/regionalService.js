import api from "./api";

// Ambil semua regional
export async function fetchRegionals(params) {
    const res = await api.get("/regionals", { params });
    return res.data; // ambil array dari content
}

// Ambil detail regional by id
export async function fetchRegionalById(id) {
    const res = await api.get(`/regionals/${id}`);
    return res.data;
}

// Create regional baru (?name=xxx)
export async function createRegional(name) {
    const res = await api.post("/regionals", null, {
        params: { name },
    });
    return res.data;
}

// Toggle aktif/nonaktif regional
export async function toggleRegional(id) {
    const res = await api.put(`/regionals/${id}/toggle`);
    return res.data;
}
