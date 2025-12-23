import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createCertificationRule } from "../../services/certificationRuleService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { fetchRefreshmentTypes } from "../../services/refreshmentTypeService";

const emptyForm = {
    certificationId: "",
    certificationLevelId: "",
    subFieldId: "",
    validityMonths: 0,
    reminderMonths: 0,
    refreshmentTypeId: "",
    wajibSetelahMasuk: "",
};

export default function CreateCertificationRuleModal({ open, onClose, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [certs, setCerts] = useState([]);
    const [levels, setLevels] = useState([]);
    const [subs, setSubs] = useState([]);
    const [refreshments, setRefreshments] = useState([]);

    useEffect(() => {
        if (open) {
            setForm(emptyForm);
            (async () => {
                try {
                    const [c, l, s, r] = await Promise.all([
                        fetchCertifications(),
                        fetchCertificationLevels(),
                        fetchSubFields(),
                        fetchRefreshmentTypes(),
                    ]);
                    setCerts(c);
                    setLevels(l);
                    setSubs(s);
                    setRefreshments(r);
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

    return (
        <dialog open className="modal">
            <div className="modal-box max-w-2xl">
                <h3 className="font-bold text-lg">Tambah Aturan Sertifikasi</h3>
                <form className="mt-4 space-y-3" onSubmit={onSubmit}>
                    {/* Sertifikasi */}
                    <div>
                        <label className="label pb-1">Sertifikasi</label>
                        <select
                            className="select select-bordered w-full"
                            value={form.certificationId}
                            onChange={(e) => setField("certificationId", e.target.value)}
                            required
                        >
                            <option value="">-- Pilih Sertifikasi --</option>
                            {certs.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.code} - {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Jenjang + Sub Bidang */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label pb-1">Jenjang</label>
                            <select
                                className="select select-bordered w-full"
                                value={form.certificationLevelId}
                                onChange={(e) => setField("certificationLevelId", e.target.value)}
                            >
                                <option value="">-- Tidak ada --</option>
                                {levels.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.name} (Level {l.level})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label pb-1">Sub Bidang</label>
                            <select
                                className="select select-bordered w-full"
                                value={form.subFieldId}
                                onChange={(e) => setField("subFieldId", e.target.value)}
                            >
                                <option value="">-- Tidak ada --</option>
                                {subs.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Masa berlaku & Reminder */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label pb-1">Masa Berlaku (bulan)</label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                value={form.validityMonths}
                                onChange={(e) => setField("validityMonths", e.target.value)}
                                min={0}
                                required
                            />
                        </div>
                        <div>
                            <label className="label pb-1">Reminder (bulan sebelum)</label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                value={form.reminderMonths}
                                onChange={(e) => setField("reminderMonths", e.target.value)}
                                min={0}
                                required
                            />
                        </div>
                    </div>

                    {/* Refreshment + Wajib */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label pb-1">Refreshment</label>
                            <select
                                className="select select-bordered w-full"
                                value={form.refreshmentTypeId}
                                onChange={(e) => setField("refreshmentTypeId", e.target.value)}
                            >
                                <option value="">-- Tidak ada --</option>
                                {refreshments.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label pb-1">Wajib Setelah Masuk (bulan)</label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                value={form.wajibSetelahMasuk}
                                onChange={(e) => setField("wajibSetelahMasuk", e.target.value)}
                                min={0}
                            />
                        </div>
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
