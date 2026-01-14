// src/components/certification-levels/EditCertificationLevelModal.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, Save, Pencil, Layers, Tag } from "lucide-react";
import { updateCertificationLevel } from "../../services/certificationLevelService";

export default function EditCertificationLevelModal({ open, initial, onClose, onSaved }) {
    const [form, setForm] = useState({ level: 0, name: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open && initial) {
            setForm({
                level: Number(initial.level ?? 0),
                name: initial.name ?? "",
            });
        }
    }, [open, initial]);

    function setField(key, val) {
        setForm((f) => ({ ...f, [key]: val }));
    }

    async function onSubmit(e) {
        e.preventDefault();
        if (!initial?.id) {
            toast.error("ID tidak ditemukan");
            return;
        }
        setSubmitting(true);
        try {
            await updateCertificationLevel(initial.id, form);
            toast.success("Jenjang sertifikasi diupdate");
            onSaved?.();
            onClose?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal mengupdate data");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-lg bg-base-100 shadow-2xl border border-gray-100 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Pencil size={20} className="text-warning" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Edit Jenjang Sertifikasi</h3>
                            <p className="text-xs text-gray-500">Ubah master data jenjang</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-5 text-sm">
                    <form id="edit-level-form" onSubmit={onSubmit} className="space-y-4">
                        {/* Level */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Layers size={14} /> Level
                            </label>
                            <input
                                type="number"
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.level}
                                onChange={(e) => setField("level", e.target.value)}
                                min={1}
                                max={10}
                                required
                                placeholder="Contoh: 4"
                            />
                        </div>

                        {/* Nama */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Tag size={14} /> Nama Jenjang
                            </label>
                            <input
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.name}
                                onChange={(e) => setField("name", e.target.value)}
                                required
                                placeholder="Contoh: Jenjang 4"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        className="btn btn-sm btn-ghost rounded-lg"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="edit-level-form"
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        disabled={submitting}
                    >
                        {submitting ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />}
                        {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop bg-black/50">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}