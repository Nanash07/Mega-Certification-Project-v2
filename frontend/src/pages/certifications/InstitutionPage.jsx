// src/pages/certifications/InstitutionPage.jsx
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { fetchInstitutions, deleteInstitution } from "../../services/institutionService";
import CreateInstitutionModal from "../../components/institutions/CreateInstitutionModal";
import EditInstitutionModal from "../../components/institutions/EditInstitutionModal";

export default function InstitutionPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: undefined, name: "" });

    async function load() {
        setLoading(true);
        try {
            const list = await fetchInstitutions();
            setRows(list);
        } catch {
            toast.error("Gagal memuat data lembaga");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function onDelete(id) {
        try {
            await deleteInstitution(id);
            toast.success("Institution dihapus");
            load();
        } catch {
            toast.error("Gagal menghapus lembaga");
        }
    }

    const filtered = useMemo(() => rows, [rows]);

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                    {/* Tambah */}
                    <div className="col-span-1">
                        <button className="btn btn-sm btn-primary w-full" onClick={() => setOpenCreate(true)}>
                            <Plus className="w-4 h-4" />
                            Tambah Lembaga
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs whitespace-nowrap">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>Nama</th>
                            <th>Type</th>
                            <th>Alamat</th>
                            <th>Contact Person</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs whitespace-nowrap">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            filtered.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{idx + 1}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <div className="tooltip" data-tip="Edit lembaga">
                                                <button
                                                    className="btn btn-xs btn-soft btn-warning border-warning"
                                                    onClick={() => setEditItem(r)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="tooltip" data-tip="Hapus lembaga">
                                                <button
                                                    className="btn btn-xs btn-soft btn-error border-error"
                                                    onClick={() =>
                                                        setConfirm({
                                                            open: true,
                                                            id: r.id,
                                                            name: r.name,
                                                        })
                                                    }
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{r.name}</td>
                                    <td>{r.type}</td>
                                    <td>{r.address}</td>
                                    <td>{r.contactPerson}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <CreateInstitutionModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onSaved={() => {
                    setOpenCreate(false);
                    load();
                }}
            />
            <EditInstitutionModal
                open={!!editItem}
                initial={editItem}
                onClose={() => setEditItem(null)}
                onSaved={() => {
                    setEditItem(null);
                    load();
                }}
            />

            {/* Confirm Delete */}
            <dialog className="modal" open={confirm.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Hapus Institution?</h3>
                    {confirm.name && (
                        <p className="py-3">
                            Yakin mau hapus <b>{confirm.name}</b>?
                        </p>
                    )}
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
