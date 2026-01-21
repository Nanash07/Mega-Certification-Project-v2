// src/components/employees/CreateEmployeeModal.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createEmployee } from "../../services/employeeService";
import { fetchJobPositions } from "../../services/jobPositionService";

const emptyForm = {
  nip: "",
  name: "",
  email: "",
  gender: "",
  jobPositionId: "",
  joinDate: "",
  status: "ACTIVE",
};

export default function CreateEmployeeModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      (async () => {
        try {
          const j = await fetchJobPositions();
          setJobs(j);
        } catch {
          toast.error("Gagal memuat data jabatan");
        }
      })();
    }
  }, [open]);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createEmployee(form);
      toast.success("Pegawai dibuat");
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal membuat pegawai");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <dialog open className="modal">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">Tambah Pegawai</h3>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="label pb-1">NIP</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.nip}
              onChange={(e) => setField("nip", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label pb-1">Nama</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label pb-1">Email</label>
            <input
              type="email"
              className="input input-bordered w-full"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </div>

          <div>
            <label className="label pb-1">Gender</label>
            <select
              className="select select-bordered w-full"
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value)}
            >
              <option value="">-- Pilih Gender --</option>
              <option value="M">Laki-laki</option>
              <option value="F">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="label pb-1">Jabatan</label>
            <select
              className="select select-bordered w-full"
              value={form.jobPositionId}
              onChange={(e) => setField("jobPositionId", e.target.value)}
              required
            >
              <option value="">-- Pilih Jabatan --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.unitName} / {j.divisionName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label pb-1">Tanggal Masuk</label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={form.joinDate}
              onChange={(e) => setField("joinDate", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label pb-1">Status</label>
            <select
              className="select select-bordered w-full"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="MUTASI">Mutasi</option>
            </select>
          </div>
          
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-sm btn-ghost rounded-lg border border-gray-200"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </button>
            <button
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