import { useEffect, useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { updateException } from "../../services/employeeExceptionService";
import { fetchEmployees } from "../../services/employeeService";
import { fetchCertificationRules } from "../../services/certificationRuleService";

export default function EditExceptionModal({ open, onClose, onSaved, initial, picCertCodes }) {
    const [employees, setEmployees] = useState([]);
    const [rules, setRules] = useState([]);
    const [form, setForm] = useState({ employeeId: null, certificationRuleId: null, notes: "" });

    useEffect(() => {
        if (!open || !initial) return;

        const load = async () => {
            try {
                const [empRes, ruleRes] = await Promise.all([
                    fetchEmployees({ page: 0, size: 50 }),
                    fetchCertificationRules(),
                ]);

                setEmployees(empRes.content || []);

                let effectiveRules = ruleRes || [];

                // kalau mau, bisa tetap filter rules buat PIC, tapi employee/rule tetap disabled
                const picSet =
                    picCertCodes instanceof Set
                        ? picCertCodes
                        : Array.isArray(picCertCodes)
                        ? new Set(picCertCodes)
                        : null;

                if (picSet && picSet.size > 0) {
                    effectiveRules = effectiveRules.filter(
                        (r) => r.certificationCode && picSet.has(r.certificationCode)
                    );

                    // pastikan rule existing tetap ada, walaupun sekarang di luar scope
                    if (
                        initial.certificationRuleId &&
                        !effectiveRules.some((r) => r.id === initial.certificationRuleId)
                    ) {
                        const current = (ruleRes || []).find((r) => r.id === initial.certificationRuleId);
                        if (current) {
                            effectiveRules = [...effectiveRules, current];
                        }
                    }
                }

                setRules(effectiveRules);
            } catch (e) {
                console.error("load EditExceptionModal error:", e);
                toast.error("Gagal memuat data untuk edit exception");
            }
        };

        load();

        setForm({
            employeeId: initial.employeeId,
            certificationRuleId: initial.certificationRuleId,
            notes: initial.notes || "",
        });
    }, [open, initial, picCertCodes]);

    async function onSubmit() {
        if (!form.notes.trim()) {
            toast.error("⚠️ Catatan tidak boleh kosong");
            return;
        }
        try {
            await updateException(initial.id, { notes: form.notes });
            toast.success("Exception diupdate");
            onSaved?.();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal mengupdate exception");
        }
    }

    const employeeOptions = employees.map((e) => ({
        value: e.id,
        label: `${e.nip} - ${e.name} (${e.jobPositionTitle || e.jobName || "-"})`,
    }));

    const ruleOptions = rules.map((r) => ({
        value: r.id,
        label: `${r.certificationCode} - ${r.certificationLevelName || "-"} - ${r.subFieldCode || "-"}`,
    }));

    return (
        <dialog className={`modal ${open ? "modal-open" : ""}`}>
            <div className="modal-box max-w-2xl">
                <h3 className="font-bold text-lg mb-4">Edit Exception</h3>

                {/* Employee (disabled saat edit) */}
                <div className="mb-3">
                    <label className="label">Pegawai</label>
                    <Select
                        isDisabled
                        options={employeeOptions}
                        value={employeeOptions.find((opt) => opt.value === form.employeeId) || null}
                    />
                </div>

                {/* Certification Rule (disabled saat edit) */}
                <div className="mb-3">
                    <label className="label">Sertifikasi</label>
                    <Select
                        isDisabled
                        options={ruleOptions}
                        value={ruleOptions.find((opt) => opt.value === form.certificationRuleId) || null}
                    />
                </div>

                {/* Notes */}
                <div className="mb-3">
                    <label className="label">Catatan</label>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                </div>

                <div className="modal-action">
                    <button className="btn btn-sm btn-ghost rounded-lg border border-gray-200" onClick={onClose}>
                        Batal
                    </button>
                    <button className="btn btn-primary" onClick={onSubmit}>
                        Update
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
