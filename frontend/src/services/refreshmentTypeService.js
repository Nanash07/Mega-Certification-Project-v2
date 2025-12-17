import api from "./api"; // axios instance lo, biasanya udah ada di project

// Ambil semua refreshment type
export async function fetchRefreshmentTypes() {
    const res = await api.get("/refreshment-types");
    return res.data;
}

// Tambah refreshment type
export async function createRefreshmentType(data) {
    const res = await api.post("/refreshment-types", data);
    return res.data;
}

// Update refreshment type
export async function updateRefreshmentType(id, data) {
    const res = await api.put(`/refreshment-types/${id}`, data);
    return res.data;
}

// Hapus refreshment type
export async function deleteRefreshmentType(id) {
    await api.delete(`/refreshment-types/${id}`);
}
