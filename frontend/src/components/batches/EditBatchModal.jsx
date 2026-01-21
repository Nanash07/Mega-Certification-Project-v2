import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { updateBatch } from "../../services/batchService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchInstitutions } from "../../services/institutionService";
import { X, Pencil, Save, Calendar, Users, Building, FileCheck, Tag, Package } from "lucide-react";

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

    const menuPortalTarget = useMemo(() => (typeof document !== "undefined" ? document.body : null), []);

    const selectStyles = useMemo(
        () => ({
            menuPortal: (base) => ({ ...base, zIndex: 999999 }),
            menu: (base) => ({ ...base, zIndex: 999999 }),
            control: (base) => ({ ...base, borderRadius: "0.5rem", minHeight: "2.5rem" }),
        }),
        []
    );

    const typeOptions = [
        { value: "CERTIFICATION", label: "Sertifikasi" },
        { value: "TRAINING", label: "Training" },
        { value: "REFRESHMENT", label: "Refreshment" },
        { value: "EXTENSION", label: "Perpanjang" },
    ];

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

        Promise.all([fetchCertificationRules(), fetchInstitutions()])
            .then(([rulesRes, insts]) => {
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

            if (payload.quota === "") {
                delete payload.quota;
            } else {
                payload.quota = parseInt(payload.quota, 10);
                if (Number.isNaN(payload.quota)) delete payload.quota;
            }

            Object.keys(payload).forEach((k) => {
                if (payload[k] === null || payload[k] === "") delete payload[k];
            });

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
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Pencil size={20} className="text-warning" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Edit Batch</h3>
                            <p className="text-xs text-gray-500">Perbarui informasi batch</p>
                        </div>
                    </div>
                    <button
                        className="btn btn-sm btn-circle btn-ghost"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5 text-sm">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Tag size={14} /> Nama Batch
                        </label>
                        <input
                            type="text"
                            value={form.batchName ?? ""}
                            onChange={(e) => setForm({ ...form, batchName: e.target.value })}
                            className="input input-bordered input-sm w-full rounded-lg"
                            placeholder="Contoh: Batch AAJI Januari 2025"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Package size={14} /> Jenis Batch
                        </label>
                        <Select
                            menuPortalTarget={menuPortalTarget}
                            menuPosition="fixed"
                            styles={selectStyles}
                            options={typeOptions}
                            value={typeOptions.find((t) => t.value === (form.type ?? "CERTIFICATION")) || null}
                            onChange={(opt) => setForm({ ...form, type: opt?.value || "CERTIFICATION" })}
                            placeholder="Pilih Jenis Batch"
                            isClearable={false}
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <FileCheck size={14} /> Aturan Sertifikasi
                        </label>
                        <Select
                            menuPortalTarget={menuPortalTarget}
                            menuPosition="fixed"
                            styles={selectStyles}
                            options={rules}
                            value={rules.find((r) => r.value === (form.certificationRuleId ?? null)) || null}
                            onChange={(opt) => setForm({ ...form, certificationRuleId: opt?.value ?? null })}
                            placeholder="Pilih Aturan Sertifikasi"
                            isClearable
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Building size={14} /> Lembaga
                        </label>
                        <Select
                            menuPortalTarget={menuPortalTarget}
                            menuPosition="fixed"
                            styles={selectStyles}
                            options={institutions}
                            value={institutions.find((i) => i.value === (form.institutionId ?? null)) || null}
                            onChange={(opt) => setForm({ ...form, institutionId: opt?.value ?? null })}
                            placeholder="Pilih Lembaga"
                            isClearable
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Users size={14} /> Quota
                        </label>
                        <input
                            type="number"
                            value={form.quota ?? ""}
                            onChange={(e) => setForm({ ...form, quota: e.target.value })}
                            className="input input-bordered input-sm w-full rounded-lg"
                            placeholder="Contoh: 50"
                            min={1}
                            max={250}
                        />
                        <p className="text-xs text-gray-400">
                            Min 1, max 250. Kosongkan untuk unlimited.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Status</label>
                        <select
                            value={form.status ?? "PLANNED"}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="select select-bordered select-sm w-full rounded-lg"
                        >
                            <option value="PLANNED">Planned</option>
                            <option value="ONGOING">Ongoing</option>
                            <option value="FINISHED">Finished</option>
                            <option value="CANCELED">Canceled</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Calendar size={14} /> Tanggal Mulai
                        </label>
                        <input
                            type="date"
                            value={form.startDate ?? ""}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            className="input input-bordered input-sm w-full rounded-lg"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Calendar size={14} /> Tanggal Selesai
                        </label>
                        <input
                            type="date"
                            value={form.endDate ?? ""}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            className="input input-bordered input-sm w-full rounded-lg"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                        className="btn btn-sm btn-ghost rounded-lg border border-gray-200"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Batal
                    </button>
                    <button
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        onClick={handleSave}
                        disabled={saving}
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
