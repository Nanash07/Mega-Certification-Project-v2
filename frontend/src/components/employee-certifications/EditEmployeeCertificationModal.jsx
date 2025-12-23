import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { updateCertification } from "../../services/employeeCertificationService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchInstitutions } from "../../services/institutionService";

export default function EditCertificationModal({ open, data, onClose, onSaved }) {
    const [rules, setRules] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [form, setForm] = useState({});

    // Prefill form
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
        try {
            const { employeeId, employeeLabel, ...payload } = form; // jangan kirim employee
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
        }
    }

    if (!open) return null;

    return (
        <dialog className="modal" open={open}>
            <div className="modal-box max-w-3xl">
                <h3 className="font-bold text-lg mb-4">Edit Sertifikasi Pegawai</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* Baris 1 */}
                    <div>
                        <label className="block mb-1">Pegawai</label>
                        <input
                            type="text"
                            value={form.employeeLabel || ""}
                            disabled
                            className="input input-bordered w-full bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Aturan Sertifikasi</label>
                        <Select
                            options={rules}
                            value={rules.find((r) => r.value === form.certificationRuleId) || null}
                            onChange={(opt) => setForm({ ...form, certificationRuleId: opt?.value })}
                            placeholder="Pilih Aturan Sertifikasi"
                            isClearable
                        />
                    </div>

                    {/* Baris 2 */}
                    <div>
                        <label className="block mb-1">Lembaga</label>
                        <Select
                            options={institutions}
                            value={institutions.find((i) => i.value === form.institutionId) || null}
                            onChange={(opt) => setForm({ ...form, institutionId: opt?.value })}
                            placeholder="Pilih Lembaga"
                            isClearable
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Nomor Sertifikat</label>
                        <input
                            type="text"
                            value={form.certNumber || ""}
                            onChange={(e) => setForm({ ...form, certNumber: e.target.value })}
                            className="input input-bordered w-full"
                            placeholder="Contoh: CERT-2025-001"
                        />
                    </div>

                    {/* Baris 3 */}
                    <div>
                        <label className="block mb-1">Tanggal Sertifikat</label>
                        <input
                            type="date"
                            value={form.certDate || ""}
                            onChange={(e) => setForm({ ...form, certDate: e.target.value })}
                            className="input input-bordered w-full"
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Jenis Proses</label>
                        <select
                            value={form.processType || "SERTIFIKASI"}
                            onChange={(e) => setForm({ ...form, processType: e.target.value })}
                            className="select select-bordered w-full"
                        >
                            <option value="SERTIFIKASI">Sertifikasi</option>
                            <option value="REFRESHMENT">Refreshment</option>
                            <option value="TRAINING">Training</option>
                        </select>
                    </div>
                </div>

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>
                        Batal
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
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
