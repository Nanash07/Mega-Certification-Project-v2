// src/components/job-certification-mapping/EditJobCertificationMappingModal.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { X, Save, Pencil, Briefcase, Ruler } from "lucide-react";
import { updateJobCertificationMapping } from "../../services/jobCertificationMappingService";
import { fetchAllJobPositions } from "../../services/jobPositionService";
import { fetchCertificationRulesPaged } from "../../services/certificationRuleService";

export default function EditJobCertificationMappingModal({ open, onClose, onSaved, initial }) {
    const [jobOptions, setJobOptions] = useState([]);
    const [ruleOptions, setRuleOptions] = useState([]);
    const [job, setJob] = useState(null);
    const [rule, setRule] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // 🔹 Custom style untuk react-select
    // 🔹 Custom style untuk react-select
    const selectStyles = {
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
    };

    // 🔹 Load master data + set initial value
    useEffect(() => {
        if (open && initial) {
            (async () => {
                try {
                    const [jobs, rulesRes] = await Promise.all([
                        fetchAllJobPositions(),
                        fetchCertificationRulesPaged({ page: 0, size: 500 }),
                    ]);

                    const jobOpts = jobs.map((j) => ({ value: j.id, label: j.name }));

                    // 🔹 Sort rules: code -> level -> subField
                    const sortedRules = (rulesRes.content || []).sort((a, b) => {
                        // 1. certificationCode
                        const codeCompare = a.certificationCode.localeCompare(b.certificationCode);
                        if (codeCompare !== 0) return codeCompare;

                        // 2. certificationLevelLevel (angka, null = 0)
                        const levelA = a.certificationLevelLevel || 0;
                        const levelB = b.certificationLevelLevel || 0;
                        if (levelA !== levelB) return levelA - levelB;

                        // 3. subFieldCode (null = "")
                        const subA = a.subFieldCode || "";
                        const subB = b.subFieldCode || "";
                        return subA.localeCompare(subB);
                    });

                    const ruleOpts = sortedRules.map((r) => ({
                        value: r.id,
                        label: `${r.certificationCode}${
                            r.certificationLevelName ? " - " + r.certificationLevelName : ""
                        }${r.subFieldCode ? " - " + r.subFieldCode : ""}`,
                    }));

                    setJobOptions(jobOpts);
                    setRuleOptions(ruleOpts);

                    setJob({ value: initial.jobPositionId, label: initial.jobName });
                    setRule({
                        value: initial.certificationRuleId,
                        label: `${initial.certificationCode}${
                            initial.certificationLevelName ? " - " + initial.certificationLevelName : ""
                        }${initial.subFieldCode ? " - " + initial.subFieldCode : ""}`,
                    });
                } catch (err) {
                    console.error("load master error:", err);
                    toast.error("Gagal memuat data master");
                }
            })();
        }
    }, [open, initial]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!job || !rule) {
            toast.error("⚠️ Pilih jabatan & rule terlebih dahulu");
            return;
        }
        setSubmitting(true);
        try {
            await updateJobCertificationMapping(initial.id, {
                jobPositionId: job.value,
                certificationRuleId: rule.value,
                isActive: initial.isActive,
            });
            toast.success("Mapping berhasil diperbarui");
            onSaved?.();
            onClose?.();
        } catch (err) {
            console.error("update error:", err);
            toast.error(err?.response?.data?.message || "Gagal update mapping");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-xl bg-base-100 shadow-2xl border border-gray-100 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Pencil size={20} className="text-warning" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Edit Job Certification Mapping</h3>
                            <p className="text-xs text-gray-500">Ubah mapping jabatan ke sertifikasi</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-5 text-sm">
                    <form id="edit-mapping-form" onSubmit={handleSubmit} className="space-y-4">
                        {/* Job Position */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Briefcase size={14} /> Job Position
                            </label>
                            <Select
                                options={jobOptions}
                                value={job}
                                onChange={setJob}
                                placeholder="Pilih Jabatan"
                                isClearable
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                                className="text-sm"
                            />
                        </div>

                        {/* Certification Rule */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Ruler size={14} /> Certification Rule
                            </label>
                            <Select
                                options={ruleOptions}
                                value={rule}
                                onChange={setRule}
                                placeholder="Pilih Rule"
                                isClearable
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                                className="text-sm"
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
                        form="edit-mapping-form"
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
