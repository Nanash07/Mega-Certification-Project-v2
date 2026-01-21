// src/components/certification-rules/CreateCertificationRuleModal.jsx
import { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { X, Save, FileCheck, Award, Layers, Grid3X3, Clock, Calendar, ShieldCheck } from "lucide-react";
import { createCertificationRule } from "../../services/certificationRuleService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";

const emptyForm = {
    certificationId: "",
    certificationLevelId: "",
    subFieldId: "",
    validityMonths: 0,
    reminderMonths: 0,
    wajibSetelahMasuk: "",
};

export default function CreateCertificationRuleModal({ open, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [certs, setCerts] = useState([]);
    const [levels, setLevels] = useState([]);
    const [subs, setSubs] = useState([]);

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
            setForm(emptyForm);
            (async () => {
                try {
                    const [c, l, s] = await Promise.all([
                        fetchCertifications(),
                        fetchCertificationLevels(),
                        fetchSubFields(),
                    ]);
                    setCerts(c);
                    setLevels(l);
                    setSubs(s);
                } catch {
                    toast.error("Gagal memuat data master");
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
            await createCertificationRule(form);
            toast.success("Aturan sertifikasi dibuat");
            onSaved?.();
            onClose?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal membuat aturan");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    const certOptions = certs.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
    const levelOptions = levels.map((l) => ({ value: l.id, label: `${l.level} - ${l.name}` }));
    const subFieldOptions = subs.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileCheck size={20} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Tambah Aturan Sertifikasi</h3>
                            <p className="text-xs text-gray-500">Buat aturan baru untuk sertifikasi pegawai</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-5 text-sm">
                    <form id="create-rule-form" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Sertifikasi */}
                        <div className="md:col-span-2 flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Award size={14} /> Sertifikasi
                            </label>
                            <Select
                                options={certOptions}
                                value={certOptions.find(o => o.value === form.certificationId) || null}
                                onChange={(opt) => setField("certificationId", opt ? opt.value : "")}
                                styles={selectStyles}
                                placeholder="Pilih Sertifikasi"
                                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                                required
                            />
                        </div>

                        {/* Jenjang */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Layers size={14} /> Jenjang
                            </label>
                            <Select
                                options={levelOptions}
                                value={levelOptions.find(o => o.value === form.certificationLevelId) || null}
                                onChange={(opt) => setField("certificationLevelId", opt ? opt.value : "")}
                                styles={selectStyles}
                                placeholder="Pilih Jenjang (Opsional)"
                                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                                isClearable
                            />
                        </div>

                        {/* Sub Bidang */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Grid3X3 size={14} /> Sub Bidang
                            </label>
                            <Select
                                options={subFieldOptions}
                                value={subFieldOptions.find(o => o.value === form.subFieldId) || null}
                                onChange={(opt) => setField("subFieldId", opt ? opt.value : "")}
                                styles={selectStyles}
                                placeholder="Pilih Sub Bidang (Opsional)"
                                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                                isClearable
                            />
                        </div>

                        {/* Masa Berlaku */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Calendar size={14} /> Masa Berlaku (bulan)
                            </label>
                            <input
                                type="number"
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.validityMonths}
                                onChange={(e) => setField("validityMonths", e.target.value)}
                                min={0}
                                required
                                placeholder="Contoh: 24"
                            />
                        </div>

                        {/* Reminder */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Clock size={14} /> Reminder (bulan sebelum)
                            </label>
                            <input
                                type="number"
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.reminderMonths}
                                onChange={(e) => setField("reminderMonths", e.target.value)}
                                min={0}
                                required
                                placeholder="Contoh: 3"
                            />
                        </div>

                        {/* Wajib Setelah Masuk */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <ShieldCheck size={14} /> Wajib Setelah Masuk (bulan)
                            </label>
                            <input
                                type="number"
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.wajibSetelahMasuk}
                                onChange={(e) => setField("wajibSetelahMasuk", e.target.value)}
                                min={0}
                                placeholder="Opsional"
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
                        form="create-rule-form"
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        disabled={submitting}
                    >
                        {submitting ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />}
                        {submitting ? "Menyimpan..." : "Simpan"}
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
