// src/pages/certifications/SubFieldPage.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { fetchSubFields, deleteSubField } from "../../services/subFieldService";
import CreateSubFieldModal from "../../components/subfields/CreateSubFieldModal";
import EditSubFieldModal from "../../components/subfields/EditSubFieldModal";

export default function SubFieldPage() {
    const [q, setQ] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: undefined, name: "" });

    async function load() {
        setLoading(true);
        try {
            const list = await fetchSubFields();
            list.sort((a, b) => a.name.localeCompare(b.name));
            setRows(list);
        } catch (e) {
            console.error(e);
            toast.error(e?.response?.data?.message || "Gagal memuat data sub bidang");
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
        return rows.filter(
            (r) =>
                r.name?.toLowerCase().includes(s) ||
                r.code?.toLowerCase().includes(s) ||
                r.certificationCode?.toLowerCase().includes(s)
        );
    }, [q, rows]);

    async function onDelete(id) {
        try {
            await deleteSubField(id);
            toast.success("Sub bidang dihapus");
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Gagal menghapus sub bidang");
        }
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                    {/* Tambah */}
                    <div className="col-span-1">
                        <button className="btn btn-sm btn-primary w-full" onClick={() => setOpenCreate(true)}>
                            <Plus className="w-4 h-4" />
                            Tambah Sub Bidang
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
                            <th>Kode Sertifikat</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs whitespace-nowrap">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-10 text-center">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            filtered.map((c, idx) => (
                                <tr key={c.id}>
                                    <td>{idx + 1}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <div className="tooltip" data-tip="Edit sub bidang">
                                                <button
                                                    className="btn btn-xs btn-soft btn-warning border-warning"
                                                    onClick={() => setEditItem(c)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="tooltip" data-tip="Hapus sub bidang">
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
                                    <td>{c.certificationCode}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <CreateSubFieldModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onSaved={() => {
                    setOpenCreate(false);
                    load();
                }}
            />
            <EditSubFieldModal
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
                    <h3 className="font-bold text-lg">Hapus Sub Bidang?</h3>
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
