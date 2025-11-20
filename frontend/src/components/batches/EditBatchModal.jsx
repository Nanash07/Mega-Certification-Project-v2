import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { updateBatch } from "../../services/batchService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchInstitutions } from "../../services/institutionService";

const initialForm = {
    id: null,
    batchName: "",
    certificationRuleId: null,
    institutionId: null,
    startDate: "",
    endDate: "",
    quota: "",
    status: "PLANNED",
    type: "CERTIFICATION",
};

export default function EditBatchModal({ open, data, onClose, onSaved }) {
    const [rules, setRules] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    const typeOptions = [
        { value: "CERTIFICATION", label: "Sertifikasi" },
        { value: "TRAINING", label: "Training" },
        { value: "REFRESHMENT", label: "Refreshment" },
    ];

    // helper: normalize ISO date or Date -> yyyy-MM-dd
    const toYMD = (v) => {
        if (!v) return "";
        try {
            const s = typeof v === "string" ? v : new Date(v).toISOString();
            return s.slice(0, 10);
        } catch {
            return "";
        }
    };

    useEffect(() => {
        if (!open || !data) return;

        // prefilling form (PROSES MASIH SAMA)
        setForm({
            id: data.id,
            batchName: data.batchName || "",
            certificationRuleId: data.certificationRuleId ?? null,
            institutionId: data.institutionId ?? null,
            startDate: toYMD(data.startDate),
            endDate: toYMD(data.endDate),
            quota: data.quota ?? "",
            status: data.status || "PLANNED",
            type: data.type || "CERTIFICATION",
        });

        // dropdowns
        Promise.all([fetchCertificationRules(), fetchInstitutions()])
            .then(([rulesRes, insts]) => {
                // sama seperti Create: labelnya "CODE - LEVEL - SUB"
                const rulesOpts = rulesRes.map((r) => {
                    const parts = [r.certificationCode, r.certificationLevelName, r.subFieldCode].filter(
                        (x) => x && x.trim() !== ""
                    );
                    return { value: r.id, label: parts.join(" - ") };
                });
                setRules(rulesOpts);

                setInstitutions(
                    insts.map((i) => ({
                        value: i.id,
                        label: i.name,
                    }))
                );
            })
            .catch(() => toast.error("Gagal memuat data dropdown"));
    }, [open, data]);

    async function handleSave() {
        if (!data?.id) return;
        setSaving(true);
        try {
            const payload = { ...form };
            delete payload.id;

            // quota number atau hapus (PROSES SAMA)
            if (payload.quota === "") {
                delete payload.quota;
            } else {
                payload.quota = parseInt(payload.quota, 10);
                if (Number.isNaN(payload.quota)) delete payload.quota;
            }

            // clean null/empty string (PROSES SAMA)
            Object.keys(payload).forEach((k) => {
                if (payload[k] === null || payload[k] === "") delete payload[k];
            });

            // status dikirim apa adanya, bebas mau dari FINISHED balik ke ONGOING, dll
            await updateBatch(data.id, payload);
            toast.success("Batch berhasil diperbarui");
            onSaved?.();
            onClose?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal memperbarui batch");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <dialog className="modal" open={open}>
            <div className="modal-box max-w-3xl">
                <h3 className="font-bold text-lg mb-4">Edit Batch</h3>

                {/* === Layout disamain dengan CreateBatchModal === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Nama Batch */}
                    <div>
                        <label className="block mb-1">Nama Batch</label>
                        <input
                            type="text"
                            value={form.batchName ?? ""}
                            onChange={(e) => setForm({ ...form, batchName: e.target.value })}
                            className="input input-bordered w-full"
                            placeholder="Contoh: Batch AAJI Januari 2025"
                        />
                    </div>

                    {/* Jenis Batch */}
                    <div>
                        <label className="block mb-1">Jenis Batch</label>
                        <Select
                            options={typeOptions}
                            value={typeOptions.find((t) => t.value === (form.type ?? "CERTIFICATION")) || null}
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
                            value={rules.find((r) => r.value === (form.certificationRuleId ?? null)) || null}
                            onChange={(opt) => setForm({ ...form, certificationRuleId: opt?.value ?? null })}
                            placeholder="Pilih Aturan Sertifikasi"
                            isClearable
                        />
                    </div>

                    {/* Lembaga */}
                    <div>
                        <label className="block mb-1">Lembaga</label>
                        <Select
                            options={institutions}
                            value={institutions.find((i) => i.value === (form.institutionId ?? null)) || null}
                            onChange={(opt) => setForm({ ...form, institutionId: opt?.value ?? null })}
                            placeholder="Pilih Lembaga"
                            isClearable
                        />
                    </div>

                    {/* Quota */}
                    <div>
                        <label className="block mb-1">Quota</label>
                        <input
                            type="number"
                            value={form.quota ?? ""}
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

                    {/* Status */}
                    <div>
                        <label className="block mb-1">Status</label>
                        <select
                            value={form.status ?? "PLANNED"}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="select select-bordered w-full"
                        >
                            <option value="PLANNED">Planned</option>
                            <option value="ONGOING">Ongoing</option>
                            <option value="FINISHED">Finished</option>
                            <option value="CANCELED">Canceled</option>
                        </select>
                    </div>

                    {/* Tanggal Mulai */}
                    <div>
                        <label className="block mb-1">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={form.startDate ?? ""}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            className="input input-bordered w-full"
                        />
                    </div>

                    {/* Tanggal Selesai */}
                    <div>
                        <label className="block mb-1">Tanggal Selesai</label>
                        <input
                            type="date"
                            value={form.endDate ?? ""}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            className="input input-bordered w-full"
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="modal-action">
                    <button className="btn" onClick={onClose} disabled={saving}>
                        Batal
                    </button>
                    <button className={`btn btn-primary ${saving ? "btn-disabled" : ""}`} onClick={handleSave}>
                        {saving ? <span className="loading loading-spinner loading-sm" /> : null}
                        {saving ? "Menyimpan..." : "Simpan"}
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
