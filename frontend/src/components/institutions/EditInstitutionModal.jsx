// src/components/institutions/EditInstitutionModal.jsx
import { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { X, Save, Pencil, Building, MapPin, User, Tag } from "lucide-react";
import { updateInstitution } from "../../services/institutionService";

export default function EditInstitutionModal({ open, onClose, onSaved, initial }) {
    const [form, setForm] = useState({ name: "", type: "Internal", address: "", contactPerson: "" });
    const [submitting, setSubmitting] = useState(false);

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
        if (open && initial) {
            setForm({
                name: initial.name || "",
                type: initial.type || "Internal",
                address: initial.address || "",
                contactPerson: initial.contactPerson || "",
            });
        }
    }, [open, initial]);

    async function onSubmit(e) {
        e.preventDefault();
        if (!form.name || !form.type) {
            toast.error("Nama & Type wajib diisi");
            return;
        }
        setSubmitting(true);
        try {
            await updateInstitution(initial.id, form);
            toast.success("Institution diupdate");
            onSaved?.();
            onClose?.(); // Close modal on success if desired, behavior matched with others
        } catch {
            toast.error("Gagal mengupdate institution");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    const typeOptions = [
        { value: "Internal", label: "Internal" },
        { value: "External", label: "External" },
    ];

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Pencil size={20} className="text-warning" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Edit Institusi</h3>
                            <p className="text-xs text-gray-500">Ubah master data institusi</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-5 text-sm">
                    <form id="edit-institution-form" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nama */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Building size={14} /> Nama Institusi
                            </label>
                            <input
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        {/* Type */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Tag size={14} /> Tipe
                            </label>
                            <Select
                                options={typeOptions}
                                value={typeOptions.find((opt) => opt.value === form.type) || typeOptions[0]}
                                onChange={(opt) => setForm({ ...form, type: opt ? opt.value : "Internal" })}
                                styles={selectStyles}
                                placeholder="Pilih Tipe Institusi"
                                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                                required
                            />
                        </div>

                        {/* Alamat */}
                        <div className="md:col-span-2 flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <MapPin size={14} /> Alamat
                            </label>
                            <input
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>

                        {/* Contact Person */}
                        <div className="md:col-span-2 flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <User size={14} /> Contact Person
                            </label>
                            <input
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.contactPerson}
                                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
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
                        form="edit-institution-form"
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