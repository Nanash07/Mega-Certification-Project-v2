import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2, Plus, Award } from "lucide-react";
import { fetchCertifications, deleteCertification } from "../../services/certificationService";
import CreateCertificationModal from "../../components/certifications/CreateCertificationModal";
import EditCertificationModal from "../../components/certifications/EditCertificationModal";

export default function CertificationPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
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
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Jenis Sertifikasi</h1>
                    <p className="text-xs text-gray-500">{rows.length} jenis sertifikasi</p>
                </div>
                <button
                    className="btn btn-sm btn-primary rounded-lg"
                    onClick={() => setOpenCreate(true)}
                >
                    <Plus size={14} />
                    Tambah Sertifikasi
                </button>
            </div>

            {/* Table Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead className="bg-base-200 text-xs">
                            <tr>
                                <th className="w-12">No</th>
                                <th className="w-24">Aksi</th>
                                <th>Nama</th>
                                <th>Kode</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Award size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data sertifikasi</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((c, idx) => (
                                    <tr key={c.id} className="hover">
                                        <td>{idx + 1}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <div className="tooltip" data-tip="Edit sertifikasi">
                                                    <button
                                                        className="btn btn-xs btn-soft btn-warning border border-warning rounded-lg"
                                                        onClick={() => setEditItem(c)}
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                                <div className="tooltip" data-tip="Hapus sertifikasi">
                                                    <button
                                                        className="btn btn-xs btn-soft btn-error border border-error rounded-lg"
                                                        onClick={() =>
                                                            setConfirm({
                                                                open: true,
                                                                id: c.id,
                                                                name: c.name,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-medium">{c.name}</td>
                                        <td>{c.code}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
