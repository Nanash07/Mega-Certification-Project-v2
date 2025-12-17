import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
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
    const selectStyles = {
        menuPortal: (base) => ({
            ...base,
            zIndex: 9999, // biar dropdown di atas modal
        }),
        control: (base) => ({
            ...base,
            minHeight: "48px",
            fontSize: "1rem",
        }),
        option: (base, state) => ({
            ...base,
            padding: "10px 14px",
            fontSize: "0.95rem",
            backgroundColor: state.isFocused ? "#e5e7eb" : "white",
            color: "#111827",
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
                    console.error("❌ load master error:", err);
                    toast.error("❌ Gagal memuat data master");
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
            console.error("❌ update error:", err);
            toast.error(err?.response?.data?.message || "❌ Gagal update mapping");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <dialog open className="modal">
            <div className="modal-box max-w-xl">
                <h3 className="font-bold text-lg">Edit Job Certification Mapping</h3>
                <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                    {/* Job Position */}
                    <div>
                        <label className="label pb-1">Job Position</label>
                        <Select
                            options={jobOptions}
                            value={job}
                            onChange={setJob}
                            placeholder="Pilih Jabatan"
                            isClearable
                            styles={selectStyles}
                            menuPortalTarget={document.body} // biar dropdown lewatin modal
                        />
                    </div>

                    {/* Certification Rule */}
                    <div>
                        <label className="label pb-1">Certification Rule</label>
                        <Select
                            options={ruleOptions}
                            value={rule}
                            onChange={setRule}
                            placeholder="Pilih Rule"
                            isClearable
                            styles={selectStyles}
                            menuPortalTarget={document.body} // biar dropdown lewatin modal
                        />
                    </div>

                    {/* Actions */}
                    <div className="modal-action">
                        <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                            Batal
                        </button>
                        <button className={`btn btn-primary ${submitting ? "loading" : ""}`} disabled={submitting}>
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
