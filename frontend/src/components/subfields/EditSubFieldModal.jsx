// src/components/subfields/EditSubFieldModal.jsx
import { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { X, Save, Pencil, Grid3X3, Hash, Award, Tag } from "lucide-react";
import { updateSubField } from "../../services/subFieldService";
import { fetchCertifications } from "../../services/certificationService";

export default function EditSubFieldModal({ open, initial, onClose, onSaved }) {
    const [form, setForm] = useState({ name: "", code: "", certificationId: "" });
    const [submitting, setSubmitting] = useState(false);
    const [certs, setCerts] = useState([]);

    const selectStyles = useMemo(
        () => ({
            menuPortal: (base) => ({ ...base, zIndex: 999999 }),
            menu: (base) => ({ ...base, zIndex: 999999 }),
            control: (base, state) => ({
                ...base,
                minHeight: "36px",
                fontSize: "0.875rem",
                borderRadius: "0.5rem",
                borderColor: "#d1d5db",
                boxShadow: state.isFocused ? "0 0 0 1px var(--fallback-p,oklch(var(--p)/1))" : "none",
                "&:hover": {
                    borderColor: "var(--fallback-p,oklch(var(--p)/1))",
                },
            }),
            option: (base, state) => ({
                ...base,
                padding: "8px 12px",
                fontSize: "0.875rem",
                backgroundColor: state.isFocused ? "#f3f4f6" : "white",
                color: "#1f2937",
                cursor: "pointer",
            }),
        }),
        []
    );

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const list = await fetchCertifications();
                setCerts(list.map(c => ({ value: c.id, label: c.code })));
            } catch {
                toast.error("Gagal memuat sertifikasi");
            }
        })();
    }, [open]);

    useEffect(() => {
        if (open && initial) {
            setForm({
                name: initial.name ?? "",
                code: (initial.code ?? "").toUpperCase(),
                certificationId: initial.certificationId ?? "",
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
            await updateSubField(initial.id, form);
            toast.success("Sub bidang diupdate");
            onSaved?.();
            onClose?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal mengupdate sub bidang");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Pencil size={20} className="text-warning" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Edit Sub Bidang</h3>
                            <p className="text-xs text-gray-500">Ubah master data sub bidang</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-5 text-sm">
                    <form id="edit-sub-form" onSubmit={onSubmit} className="space-y-4">
                        {/* Kode Sertifikat */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Award size={14} /> Kode Sertifikat
                            </label>
                            <Select
                                options={certs}
                                value={certs.find((c) => c.value === form.certificationId) || null}
                                onChange={(opt) => setField("certificationId", opt ? opt.value : "")}
                                styles={selectStyles}
                                placeholder="Pilih Kode Sertifikat"
                                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                                required
                            />
                        </div>

                        {/* Nama */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Tag size={14} /> Nama Sub Bidang
                            </label>
                            <input
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.name}
                                onChange={(e) => setField("name", e.target.value)}
                                required
                            />
                        </div>

                        {/* Kode */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Hash size={14} /> Kode Sub Bidang
                            </label>
                            <input
                                className="input input-bordered input-sm w-full uppercase rounded-lg"
                                value={form.code}
                                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                                required
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        className="btn btn-sm btn-ghost rounded-lg border border-gray-200"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="edit-sub-form"
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        disabled={submitting}
                    >
                        {submitting ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />}
                        {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}