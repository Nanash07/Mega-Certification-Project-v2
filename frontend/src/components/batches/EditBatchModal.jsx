import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { updateBatch } from "../../services/batchService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchInstitutions } from "../../services/institutionService";

export default function EditBatchModal({ open, data, onClose, onSaved }) {
    const [rules, setRules] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [form, setForm] = useState({});

    useEffect(() => {
        if (open && data) {
            setForm({
                id: data.id,
                batchName: data.batchName || "",
                certificationRuleId: data.certificationRuleId || null,
                institutionId: data.institutionId || null,
                startDate: data.startDate || "",
                endDate: data.endDate || "",
                quota: data.quota ?? "",
                status: data.status || "PLANNED",
                type: data.type || "CERTIFICATION", // ✅ tambahin jenis batch
            });

            Promise.all([fetchCertificationRules(), fetchInstitutions()])
                .then(([rules, insts]) => {
                    setRules(
                        rules.map((r) => {
                            const parts = [r.certificationCode, r.certificationLevelName, r.subFieldCode].filter(
                                (x) => x && x.trim() !== ""
                            );
                            return {
                                value: r.id,
                                label: parts.join(" - "),
                            };
                        })
                    );

                    setInstitutions(
                        insts.map((i) => ({
                            value: i.id,
                            label: i.name,
                        }))
                    );
                })
                .catch(() => toast.error("Gagal memuat data dropdown"));
        }
    }, [open, data]);

    async function handleSave() {
        try {
            const payload = { ...form };
            delete payload.id;

            // pastikan quota number atau null
            if (payload.quota === "") {
                delete payload.quota;
            } else {
                payload.quota = parseInt(payload.quota, 10);
            }

            Object.keys(payload).forEach((k) => {
                if (payload[k] === null || payload[k] === "") delete payload[k];
            });

            await updateBatch(data.id, payload);
            toast.success("Batch berhasil diperbarui");
            onSaved?.();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal memperbarui batch");
            console.error(err);
        }
    }

    if (!open) return null;

    const typeOptions = [
        { value: "CERTIFICATION", label: "Sertifikasi" },
        { value: "TRAINING", label: "Training" },
        { value: "REFRESHMENT", label: "Refreshment" },
    ];

    return (
        <dialog className="modal" open={open}>
            <div className="modal-box max-w-3xl">
                <h3 className="font-bold text-lg mb-4">Edit Batch</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Nama Batch */}
                    <div>
                        <label className="block mb-1">Nama Batch</label>
                        <input
                            type="text"
                            value={form.batchName}
                            onChange={(e) => setForm({ ...form, batchName: e.target.value })}
                            className="input input-bordered w-full"
                        />
                    </div>

                    {/* Jenis Batch */}
                    <div>
                        <label className="block mb-1">Jenis Batch</label>
                        <Select
                            options={typeOptions}
                            value={typeOptions.find((t) => t.value === form.type) || null}
                            onChange={(opt) => setForm({ ...form, type: opt?.value || "CERTIFICATION" })}
                            placeholder="Pilih Jenis Batch"
                            isClearable={false}
                        />
                    </div>

                    {/* Aturan Sertifikasi */}
                    <div>
                        <label className="block mb-1">Aturan Sertifikasi</label>
                        <Select
                            options={rules}
                            value={rules.find((r) => r.value === form.certificationRuleId) || null}
                            onChange={(opt) => setForm({ ...form, certificationRuleId: opt?.value || null })}
                            placeholder="Pilih Aturan Sertifikasi"
                            isClearable
                        />
                    </div>

                    {/* Lembaga */}
                    <div>
                        <label className="block mb-1">Lembaga</label>
                        <Select
                            options={institutions}
                            value={institutions.find((i) => i.value === form.institutionId) || null}
                            onChange={(opt) => setForm({ ...form, institutionId: opt?.value || null })}
                            placeholder="Pilih Lembaga"
                            isClearable
                        />
                    </div>

                    {/* Quota */}
                    <div>
                        <label className="block mb-1">Quota</label>
                        <input
                            type="number"
                            value={form.quota}
                            onChange={(e) => setForm({ ...form, quota: e.target.value })}
                            className="input input-bordered w-full"
                            placeholder="Contoh: 50"
                            min={1}
                            max={250}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Quota minimal 1, maksimal 250. Kosongkan untuk unlimited.
                        </p>
                    </div>

                    {/* Tanggal Mulai */}
                    <div>
                        <label className="block mb-1">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            className="input input-bordered w-full"
                        />
                    </div>

                    {/* Tanggal Selesai */}
                    <div>
                        <label className="block mb-1">Tanggal Selesai</label>
                        <input
                            type="date"
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            className="input input-bordered w-full"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block mb-1">Status</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="select select-bordered w-full"
                        >
                            <option value="PLANNED">Planned</option>
                            <option value="ONGOING">Ongoing</option>
                            <option value="FINISHED">Finished</option>
                            <option value="CANCELED">Canceled</option>
                        </select>
                    </div>
                </div>

                {/* Buttons */}
                <div className="modal-action">
                    <button className="btn" onClick={onClose}>
                        Batal
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        Simpan
                    </button>
                </div>
            </div>

            {/* Backdrop close */}
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
