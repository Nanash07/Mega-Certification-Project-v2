import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { X, Award, User, Building2, FileText, Calendar, Save } from "lucide-react";
import { createCertification } from "../../services/employeeCertificationService";
import { searchEmployees } from "../../services/employeeService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchInstitutions } from "../../services/institutionService";

export default function CreateCertificationModal({ open, onClose, onSaved }) {
    const [rules, setRules] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [form, setForm] = useState(defaultForm());
    const [saving, setSaving] = useState(false);

    function defaultForm() {
        return {
            employeeId: null,
            employeeLabel: "",
            certificationRuleId: null,
            institutionId: null,
            certNumber: "",
            certDate: "",
        };
    }

    const menuPortalTarget = useMemo(() => (typeof document !== "undefined" ? document.body : null), []);

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
        if (open) {
            setForm(defaultForm());
            Promise.all([fetchCertificationRules(), fetchInstitutions()])
                .then(([rules, insts]) => {
                    setRules(
                        rules.map((r) => ({
                            value: r.id,
                            label: `${r.certificationCode} - ${r.certificationLevelName || ""} - ${r.subFieldCode || ""}`,
                        }))
                    );
                    setInstitutions(insts.map((i) => ({ value: i.id, label: i.name })));
                })
                .catch(() => toast.error("Gagal memuat data dropdown"));
        }
    }, [open]);

    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchEmployees({ search: inputValue, page: 0, size: 20 });
            return res.content.map((e) => ({
                value: e.id,
                label: `${e.nip} - ${e.name}`,
            }));
        } catch {
            return [];
        }
    };

    async function handleSave() {
        setSaving(true);
        try {
            const { employeeLabel, ...payload } = form;
            Object.keys(payload).forEach((k) => {
                if (payload[k] === null || payload[k] === "") delete payload[k];
            });

            await createCertification(payload);
            toast.success("Sertifikasi pegawai berhasil ditambahkan");
            onSaved?.();
            onClose();
        } catch (err) {
            toast.error("Gagal menambahkan sertifikasi");
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Award size={20} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Tambah Sertifikasi Pegawai</h3>
                            <p className="text-xs text-gray-500">Isi form untuk menambahkan data sertifikasi</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5 text-sm">
                    {/* Pegawai */}
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <User size={14} /> Pegawai
                        </label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={loadEmployees}
                            menuPortalTarget={menuPortalTarget}
                            menuPosition="fixed"
                            styles={selectStyles}
                            value={
                                form.employeeId
                                    ? { value: form.employeeId, label: form.employeeLabel }
                                    : null
                            }
                            onChange={(opt) =>
                                setForm({
                                    ...form,
                                    employeeId: opt?.value || null,
                                    employeeLabel: opt?.label || "",
                                })
                            }
                            placeholder="Cari pegawai..."
                            isClearable
                            classNamePrefix="react-select"
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
                            onChange={(opt) =>
                                setForm({ ...form, certificationRuleId: opt?.value || null })
                            }
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
                            onChange={(opt) =>
                                setForm({ ...form, institutionId: opt?.value || null })
                            }
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
                            value={form.certNumber}
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
                            value={form.certDate}
                            onChange={(e) => setForm({ ...form, certDate: e.target.value })}
                            className="input input-bordered input-sm w-full rounded-lg"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button className="btn btn-sm btn-ghost rounded-lg border border-gray-200" onClick={onClose} disabled={saving}>
                        Batal
                    </button>
                    <button
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        onClick={handleSave}
                        disabled={saving || !form.employeeId || !form.certificationRuleId}
                    >
                        {saving ? (
                            <span className="loading loading-spinner loading-xs" />
                        ) : (
                            <Save size={14} />
                        )}
                        {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
