import { useEffect, useState } from "react";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import toast from "react-hot-toast";
import { createException } from "../../services/employeeExceptionService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchEmployees } from "../../services/employeeService";

export default function CreateExceptionModal({ open, onClose, onSaved, picCertCodes }) {
    const [rules, setRules] = useState([]);
    const [defaultEmployees, setDefaultEmployees] = useState([]);
    const [form, setForm] = useState({
        employeeId: null,
        employeeLabel: "",
        certificationRuleId: null,
        notes: "",
    });

    useEffect(() => {
        if (!open) return;

        const picSet =
            picCertCodes instanceof Set ? picCertCodes : Array.isArray(picCertCodes) ? new Set(picCertCodes) : null;

        // load rules
        fetchCertificationRules()
            .then((allRules) => {
                let effective = allRules || [];

                // kalau PIC punya scope → filter rule by certificationCode
                if (picSet && picSet.size > 0) {
                    effective = effective.filter((r) => r.certificationCode && picSet.has(r.certificationCode));
                }

                setRules(effective);
            })
            .catch(() => toast.error("Gagal memuat aturan sertifikasi"));

        // load default employees
        fetchEmployees({ page: 0, size: 10 })
            .then((res) => {
                const opts = (res.content || []).map((e) => ({
                    value: e.id,
                    label: `${e.nip} - ${e.name} (${e.jobName || "-"})`,
                }));
                setDefaultEmployees(opts);
            })
            .catch(() => {
                toast.error("Gagal memuat data pegawai");
                setDefaultEmployees([]);
            });

        // reset form tiap kali modal kebuka
        setForm({ employeeId: null, employeeLabel: "", certificationRuleId: null, notes: "" });
    }, [open, picCertCodes]);

    async function onSubmit() {
        if (!form.employeeId || !form.certificationRuleId) {
            toast.error("Pilih pegawai & sertifikasi dulu");
            return;
        }

        // double guard di FE kalau PIC scope dikirim
        const rule = rules.find((r) => r.id === form.certificationRuleId);
        const picSet =
            picCertCodes instanceof Set ? picCertCodes : Array.isArray(picCertCodes) ? new Set(picCertCodes) : null;

        if (picSet && picSet.size > 0 && rule?.certificationCode && !picSet.has(rule.certificationCode)) {
            toast.error("Sertifikasi di luar scope PIC");
            return;
        }

        try {
            await createException({
                employeeId: form.employeeId,
                certificationRuleId: form.certificationRuleId,
                notes: form.notes,
            });
            toast.success("Exception ditambahkan");
            onSaved?.();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal menambah exception");
        }
    }

    async function loadEmployeeOptions(inputValue) {
        try {
            if (!inputValue || inputValue.length < 2) {
                return defaultEmployees;
            }
            const res = await fetchEmployees({ search: inputValue, page: 0, size: 20 });
            return (res.content || []).map((e) => ({
                value: e.id,
                label: `${e.nip} - ${e.name} (${e.jobName || "-"})`,
            }));
        } catch {
            return [];
        }
    }

    const ruleOptions = (rules || []).map((r) => {
        const parts = [r.certificationCode, r.certificationLevelName, r.subFieldCode].filter(
            (x) => x && x.trim() !== "" && x !== "-"
        );
        return { value: r.id, label: parts.join(" - ") };
    });

    // === compact size & portal di atas modal ===
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
        multiValue: (base) => ({
            ...base,
            fontSize: "0.70rem",
        }),
    };

    return (
        <dialog className={`modal ${open ? "modal-open" : ""}`}>
            <div className="modal-box max-w-2xl p-5 text-xs">
                <h3 className="font-semibold text-sm mb-4">Tambah Exception</h3>

                <div className="space-y-3">
                    {/* Pegawai */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-600">Pegawai</label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions={defaultEmployees}
                            loadOptions={loadEmployeeOptions}
                            value={form.employeeId ? { value: form.employeeId, label: form.employeeLabel } : null}
                            onChange={(opt) =>
                                setForm({
                                    ...form,
                                    employeeId: opt?.value || null,
                                    employeeLabel: opt?.label || "",
                                })
                            }
                            placeholder="Cari atau pilih pegawai..."
                            className="text-xs"
                            classNamePrefix="rs"
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={smallSelectStyles}
                            menuShouldScrollIntoView={false}
                            isClearable
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Ketik minimal 2 huruf untuk mencari pegawai.</p>
                    </div>

                    {/* Aturan Sertifikasi */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-600">Aturan Sertifikasi</label>
                        <Select
                            options={ruleOptions}
                            value={ruleOptions.find((opt) => opt.value === form.certificationRuleId) || null}
                            onChange={(opt) => setForm({ ...form, certificationRuleId: opt?.value || null })}
                            placeholder="Pilih aturan sertifikasi"
                            className="text-xs"
                            classNamePrefix="rs"
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={smallSelectStyles}
                            menuShouldScrollIntoView={false}
                            isClearable
                        />
                        {picCertCodes && (
                            <p className="text-[10px] text-gray-400 mt-1">
                                *PIC hanya dapat memilih sertifikasi dalam scope yang diberikan.
                            </p>
                        )}
                    </div>

                    {/* Catatan */}
                    <div>
                        <label className="block mb-1 font-medium text-gray-600">Catatan</label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full text-xs"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Catatan tambahan (opsional)"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="modal-action mt-4 flex justify-end gap-2">
                    <button className="btn btn-sm" onClick={onClose}>
                        Batal
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={onSubmit}>
                        Simpan
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
