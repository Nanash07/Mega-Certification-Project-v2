// src/components/institutions/CreateInstitutionModal.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createInstitution } from "../../services/institutionService";

const emptyForm = {
    name: "",
    type: "Internal",
    address: "",
    contactPerson: "",
};

export default function CreateInstitutionModal({ open, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) setForm(emptyForm);
    }, [open]);

    function setField(key, val) {
        setForm((f) => ({ ...f, [key]: val }));
    }

    async function onSubmit(e) {
        e.preventDefault();
        if (!form.name || !form.type) {
            toast.error("Nama & Type wajib diisi");
            return;
        }
        setSubmitting(true);
        try {
            await createInstitution(form);
            toast.success("Institution berhasil ditambahkan");
            onSaved?.();
            onClose?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || "❌ Gagal menambah institution");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <dialog open className="modal">
            <div className="modal-box max-w-2xl">
                <h3 className="font-bold text-lg mb-4">Tambah Institution</h3>
                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nama */}
                        <div>
                            <label className="text-sm opacity-70">Nama</label>
                            <input
                                type="text"
                                className="input input-bordered w-full mt-1"
                                value={form.name}
                                onChange={(e) => setField("name", e.target.value)}
                                required
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <label className="text-sm opacity-70">Type</label>
                            <select
                                className="select select-bordered w-full mt-1"
                                value={form.type}
                                onChange={(e) => setField("type", e.target.value)}
                                required
                            >
                                <option value="Internal">Internal</option>
                                <option value="External">External</option>
                            </select>
                        </div>
                    </div>

                    {/* Alamat */}
                    <div>
                        <label className="text-sm opacity-70">Alamat</label>
                        <input
                            type="text"
                            className="input input-bordered w-full mt-1"
                            value={form.address}
                            onChange={(e) => setField("address", e.target.value)}
                        />
                    </div>

                    {/* Contact Person */}
                    <div>
                        <label className="text-sm opacity-70">Contact Person</label>
                        <input
                            type="text"
                            className="input input-bordered w-full mt-1"
                            value={form.contactPerson}
                            onChange={(e) => setField("contactPerson", e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="modal-action mt-6">
                        <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                            Batal
                        </button>
                        <button
                            type="submit"
                            className={`btn btn-primary ${submitting ? "loading" : ""}`}
                            disabled={submitting}
                        >
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
