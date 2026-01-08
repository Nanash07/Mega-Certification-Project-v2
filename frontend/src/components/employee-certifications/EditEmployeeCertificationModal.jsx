import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { X, Pencil, Award, Building2, FileText, Calendar, Tag, Save, User } from "lucide-react";
import { updateCertification } from "../../services/employeeCertificationService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchInstitutions } from "../../services/institutionService";

export default function EditCertificationModal({ open, data, onClose, onSaved }) {
    const [rules, setRules] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    const menuPortalTarget = useMemo(() => (typeof document !== "undefined" ? document.body : null), []);

    const selectStyles = useMemo(
        () => ({
            menuPortal: (base) => ({ ...base, zIndex: 999999 }),
            menu: (base) => ({ ...base, zIndex: 999999 }),
            control: (base) => ({ ...base, borderRadius: "0.5rem", minHeight: "2.5rem" }),
        }),
        []
    );

    useEffect(() => {
        if (open && data) {
            setForm({
                employeeId: data.employeeId,
                employeeLabel: `${data.nip} - ${data.employeeName}`,
                certificationRuleId: data.certificationRuleId,
                institutionId: data.institutionId,
                certNumber: data.certNumber,
                certDate: data.certDate ? data.certDate.split("T")[0] : "",
                processType: data.processType || "SERTIFIKASI",
            });

            Promise.all([fetchCertificationRules(), fetchInstitutions()])
                .then(([rules, insts]) => {
                    setRules(
                        rules.map((r) => ({
                            value: r.id,
                            label: `${r.certificationCode} - ${r.certificationLevelName || ""} - ${
                                r.subFieldCode || ""
                            }`,
                        }))
                    );
                    setInstitutions(insts.map((i) => ({ value: i.id, label: i.name })));
                })
                .catch(() => toast.error("Gagal memuat data dropdown"));
        }
    }, [open, data]);

    async function handleSave() {
        setSaving(true);
        try {
            const { employeeId, employeeLabel, ...payload } = form;
            Object.keys(payload).forEach((k) => {
                if (payload[k] === null || payload[k] === "") delete payload[k];
            });

            await updateCertification(data.id, payload);
            toast.success("Sertifikasi pegawai berhasil diupdate");
            onSaved?.();
            onClose();
        } catch (err) {
            toast.error("Gagal update sertifikasi");
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-3xl bg-base-100 shadow-2xl border border-gray-100 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Pencil size={20} className="text-warning" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Edit Sertifikasi Pegawai</h3>
                            <p className="text-xs text-gray-500">Ubah data sertifikasi pegawai</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5 text-sm">
                    {/* Pegawai (Disabled) */}
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <User size={14} /> Pegawai
                        </label>
                        <input
                            type="text"
                            value={form.employeeLabel || ""}
                            disabled
                            className="input input-bordered input-sm w-full rounded-lg bg-gray-100 cursor-not-allowed"
                        />
                    </div>

                    {/* Aturan Sertifikasi */}
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Award size={14} /> Aturan Sertifikasi
                        </label>
                        <Select
                            menuPortalTarget={menuPortalTarget}
                            menuPosition="fixed"
                            styles={selectStyles}
                            options={rules}
                            value={rules.find((r) => r.value === form.certificationRuleId) || null}
                            onChange={(opt) => setForm({ ...form, certificationRuleId: opt?.value })}
                            placeholder="Pilih Aturan Sertifikasi"
                            isClearable
                            classNamePrefix="react-select"
                        />
                    </div>

                    {/* Lembaga */}
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Building2 size={14} /> Lembaga
                        </label>
                        <Select
                            menuPortalTarget={menuPortalTarget}
                            menuPosition="fixed"
                            styles={selectStyles}
                            options={institutions}
                            value={institutions.find((i) => i.value === form.institutionId) || null}
                            onChange={(opt) => setForm({ ...form, institutionId: opt?.value })}
                            placeholder="Pilih Lembaga"
                            isClearable
                            classNamePrefix="react-select"
                        />
                    </div>

                    {/* Nomor Sertifikat */}
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <FileText size={14} /> Nomor Sertifikat
                        </label>
                        <input
                            type="text"
                            value={form.certNumber || ""}
                            onChange={(e) => setForm({ ...form, certNumber: e.target.value })}
                            className="input input-bordered input-sm w-full rounded-lg"
                            placeholder="Contoh: CERT-2025-001"
                        />
                    </div>

                    {/* Tanggal Sertifikat */}
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Calendar size={14} /> Tanggal Sertifikat
                        </label>
                        <input
                            type="date"
                            value={form.certDate || ""}
                            onChange={(e) => setForm({ ...form, certDate: e.target.value })}
                            className="input input-bordered input-sm w-full rounded-lg"
                        />
                    </div>

                    {/* Jenis Proses */}
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Tag size={14} /> Jenis Proses
                        </label>
                        <select
                            value={form.processType || "SERTIFIKASI"}
                            onChange={(e) => setForm({ ...form, processType: e.target.value })}
                            className="select select-bordered select-sm w-full rounded-lg"
                        >
                            <option value="SERTIFIKASI">Sertifikasi</option>
                            <option value="REFRESHMENT">Refreshment</option>
                            <option value="TRAINING">Training</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button className="btn btn-sm btn-ghost rounded-lg" onClick={onClose} disabled={saving}>
                        Batal
                    </button>
                    <button className="btn btn-sm btn-primary rounded-lg gap-1" onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <span className="loading loading-spinner loading-xs" />
                        ) : (
                            <Save size={14} />
                        )}
                        {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop bg-black/50">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
