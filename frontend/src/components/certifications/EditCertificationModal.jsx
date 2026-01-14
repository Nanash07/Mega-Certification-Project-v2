// src/components/certifications/EditCertificationModal.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, Save, Pencil, Tag, Hash } from "lucide-react";
import { updateCertification } from "../../services/certificationService";

export default function EditCertificationModal({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // sinkronisasi initial -> state form
  useEffect(() => {
    if (open && initial) {
      setForm({
        name: initial.name ?? "",
        code: (initial.code ?? "").toUpperCase(),
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
      await updateCertification(initial.id, form);
      toast.success("Jenis sertifikasi diupdate");
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
              <h3 className="font-bold text-lg">Edit Jenis Sertifikasi</h3>
              <p className="text-xs text-gray-500">Ubah master data sertifikasi</p>
            </div>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 text-sm">
          <form id="edit-cert-form" onSubmit={onSubmit} className="space-y-4">
            {/* Nama */}
            <div className="flex flex-col gap-1">
              <label className="font-medium text-gray-600 flex items-center gap-1">
                <Tag size={14} /> Nama Sertifikasi
              </label>
              <input
                className="input input-bordered input-sm w-full rounded-lg"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Contoh: Manajemen Risiko Level 1"
                required
              />
            </div>

            {/* Kode */}
            <div className="flex flex-col gap-1">
              <label className="font-medium text-gray-600 flex items-center gap-1">
                <Hash size={14} /> Kode Sertifikasi
              </label>
              <input
                className="input input-bordered input-sm w-full uppercase rounded-lg"
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                placeholder="Contoh: BSMR1"
                required
                maxLength={20}
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
            form="edit-cert-form"
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