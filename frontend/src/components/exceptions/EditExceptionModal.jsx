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
        label: `${e.nip} - ${e.name}`,
    }));

    const ruleOptions = rules.map((r) => {
        const parts = [
            r.certificationCode,
            r.certificationLevelLevel ? `Jenjang ${r.certificationLevelLevel}` : null,
            r.subFieldCode || null
        ].filter(Boolean);
        return { value: r.id, label: parts.join(" - ") };
    });

    // Compact select styles (sama dengan CreateExceptionModal)
    const smallSelectStyles = {
        menuPortal: (base) => ({ ...base, zIndex: 99999 }),
        control: (base, state) => ({
            ...base,
            minHeight: 32,
            height: 32,
            fontSize: "0.75rem",
            borderColor: state.isFocused ? "#60a5fa" : base.borderColor,
            boxShadow: "none",
            ":hover": { borderColor: "#60a5fa" },
        }),
        valueContainer: (base) => ({
            ...base,
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 6,
            paddingRight: 6,
        }),
        indicatorsContainer: (base) => ({
            ...base,
            height: 32,
        }),
        input: (base) => ({
            ...base,
            margin: 0,
            padding: 0,
        }),
        menu: (base) => ({
            ...base,
            fontSize: "0.75rem",
        }),
        option: (base, state) => ({
            ...base,
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 10,
            paddingRight: 10,
            backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#f3f4f6" : "white",
            color: state.isSelected ? "white" : "black",
            cursor: "pointer",
        }),
        placeholder: (base) => ({
            ...base,
            fontSize: "0.75rem",
        }),
        singleValue: (base) => ({
            ...base,
            fontSize: "0.75rem",
        }),
    };

    return (
        <dialog className={`modal ${open ? "modal-open" : ""}`}>
            <div className="modal-box max-w-2xl p-5 text-xs">
                <h3 className="font-semibold text-sm mb-4">Edit Exception</h3>

                <div className="grid grid-cols-2 gap-4">
                    {/* Pegawai (disabled) */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-600">Pegawai</label>
                        <Select
                            isDisabled
                            options={employeeOptions}
                            value={employeeOptions.find((opt) => opt.value === form.employeeId) || null}
                            className="text-xs"
                            classNamePrefix="rs"
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={smallSelectStyles}
                        />
                    </div>

                    {/* Jabatan (disabled, show from initial) */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-600">Jabatan</label>
                        <Select
                            isDisabled
                            options={[{ value: initial?.jobPositionId, label: initial?.jobPositionTitle || "-" }]}
                            value={{ value: initial?.jobPositionId, label: initial?.jobPositionTitle || "-" }}
                            className="text-xs"
                            classNamePrefix="rs"
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={smallSelectStyles}
                        />
                    </div>

                    {/* Aturan Sertifikasi (disabled) */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-600">Aturan Sertifikasi</label>
                        <Select
                            isDisabled
                            options={ruleOptions}
                            value={ruleOptions.find((opt) => opt.value === form.certificationRuleId) || null}
                            className="text-xs"
                            classNamePrefix="rs"
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={smallSelectStyles}
                        />
                    </div>

                    {/* Catatan */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-600">Catatan</label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full text-xs"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Catatan"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="modal-action mt-4 flex justify-end gap-2">
                    <button className="btn btn-sm btn-ghost rounded-lg border border-gray-200" onClick={onClose}>
                        Batal
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={onSubmit}>
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
