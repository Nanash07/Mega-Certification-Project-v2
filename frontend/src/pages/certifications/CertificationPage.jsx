// src/pages/certifications/CertificationPage.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { fetchCertifications, deleteCertification } from "../../services/certificationService";
import CreateCertificationModal from "../../components/certifications/CreateCertificationModal";
import EditCertificationModal from "../../components/certifications/EditCertificationModal";

// helper render (kalau nanti mau dipakai)
function YesNo({ val }) {
    return val ? <span className="badge badge-success">Ya</span> : <span className="badge">Tidak</span>;
}

export default function CertificationPage() {
    // filter basic (belum ada input, tapi disiapin kalau nanti mau ditambah search)
    const [q, setQ] = useState("");
    // data state
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    // modals
    const [openCreate, setOpenCreate] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: undefined, name: "" });

    async function load() {
        setLoading(true);
        try {
            const list = await fetchCertifications();
            list.sort((a, b) => a.name.localeCompare(b.name));
            setRows(list);
        } catch (e) {
            console.error(e);
            toast.error(e?.response?.data?.message || "Gagal memuat data sertifikasi");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return rows;
        return rows.filter((r) => r.name?.toLowerCase().includes(s) || r.code?.toLowerCase().includes(s));
    }, [q, rows]);

    async function onDelete(id) {
        try {
            await deleteCertification(id);
            toast.success("Jenis sertifikasi dihapus");
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Gagal menghapus");
        }
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                    <div className="col-span-1">
                        <button className="btn btn-sm btn-primary w-full" onClick={() => setOpenCreate(true)}>
                            <Plus className="w-4 h-4" />
                            Tambah Jenis Sertifikasi
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs whitespace-nowrap">
                        <tr>
                            <th>No.</th>
                            <th>Aksi</th>
                            <th>Nama</th>
                            <th>Kode</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs whitespace-nowrap">
                        {loading && (
                            <tr>
                                <td colSpan={4} className="py-10 text-center">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        )}

                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            filtered.length > 0 &&
                            filtered.map((c, idx) => (
                                <tr key={c.id}>
                                    <td>{idx + 1}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <div className="tooltip" data-tip="Edit jenis sertifikasi">
                                                <button
                                                    className="btn btn-xs btn-soft btn-warning border-warning"
                                                    onClick={() => setEditItem(c)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="tooltip" data-tip="Hapus jenis sertifikasi">
                                                <button
                                                    className="btn btn-xs btn-soft btn-error border-error"
                                                    onClick={() =>
                                                        setConfirm({
                                                            open: true,
                                                            id: c.id,
                                                            name: c.name,
                                                        })
                                                    }
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{c.name}</td>
                                    <td>{c.code}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <CreateCertificationModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onSaved={() => {
                    setOpenCreate(false);
                    load();
                }}
            />
            <EditCertificationModal
                open={!!editItem}
                initial={editItem}
                onClose={() => setEditItem(null)}
                onSaved={() => {
                    setEditItem(null);
                    load();
                }}
            />

            {/* Confirm delete */}
            <dialog className="modal" open={confirm.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Hapus Jenis Sertifikasi?</h3>
                    <p className="py-3">
                        Yakin mau hapus <b>{confirm.name}</b>?
                    </p>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setConfirm({ open: false, id: undefined, name: "" })}>
                            Batal
                        </button>
                        <button
                            className="btn btn-error"
                            onClick={() => {
                                onDelete(confirm.id);
                                setConfirm({ open: false, id: undefined, name: "" });
                            }}
                        >
                            Hapus
                        </button>
                    </div>
                </div>
                <form
                    method="dialog"
                    className="modal-backdrop"
                    onSubmit={() => setConfirm({ open: false, id: undefined, name: "" })}
                >
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}
