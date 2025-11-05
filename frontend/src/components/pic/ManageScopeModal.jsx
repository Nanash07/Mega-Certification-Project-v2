import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { fetchCertifications } from "../../services/certificationService";
import { assignPicScope } from "../../services/picScopeService";

export default function ManageScopeModal({ open, onClose, user, onSaved }) {
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);

    // Hanya atur z-index menu react-select supaya muncul di atas modal
    const selectStyles = {
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    };

    useEffect(() => {
        if (!open || !user) return;
        (async () => {
            try {
                const certs = await fetchCertifications();
                const opts =
                    (certs || [])
                        .map((c) => ({
                            value: c.id,
                            label: String(c.code || c.name || `CERT-${c.id}`),
                        }))
                        .sort((a, b) => a.label.localeCompare(b.label, "id")) || [];
                setOptions(opts);

                const current =
                    (user.certifications || []).map((c) => ({
                        value: c.certificationId,
                        label: c.certificationCode,
                    })) || [];
                setSelected(current);
            } catch (e) {
                console.error("❌ Gagal load certifications:", e);
                toast.error("Gagal memuat certifications");
            }
        })();
    }, [open, user]);

    const isDirty = useMemo(() => {
        const a = new Set(selected.map((s) => s.value));
        const b = new Set((user?.certifications || []).map((c) => c.certificationId));
        if (a.size !== b.size) return true;
        for (const v of a) if (!b.has(v)) return true;
        return false;
    }, [selected, user]);

    async function handleSave() {
        if (!user) return;
        setLoading(true);
        try {
            const ids = selected.map((s) => s.value);
            await assignPicScope(user.userId, ids);
            toast.success("Scope PIC berhasil disimpan");
            onSaved?.();
            onClose?.();
        } catch (e) {
            console.error("❌ Gagal simpan scope PIC:", e);
            toast.error("Gagal menyimpan scope PIC");
        } finally {
            setLoading(false);
        }
    }

    if (!open || !user) return null;

    return (
        <dialog open={open} className="modal modal-open">
            <div className="modal-box">
                {/* ukuran default DaisyUI */}
                <h3 className="font-bold text-lg mb-3">
                    Kelola Scope — <span className="text-primary">{user.username}</span>
                </h3>

                <div className="mb-4">
                    <label className="block mb-1">Sertifikasi yang diizinkan</label>
                    <Select
                        isMulti
                        options={options}
                        value={selected}
                        onChange={setSelected}
                        styles={selectStyles}
                        placeholder="Pilih certifications…"
                        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                    />
                    <div className="text-xs opacity-70 mt-2">
                        Dipilih: <b>{selected.length}</b>
                    </div>
                </div>

                <div className="modal-action">
                    <button className="btn" onClick={onClose} disabled={loading}>
                        Batal
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={loading || !isDirty}
                        title={!isDirty ? "Tidak ada perubahan" : "Simpan perubahan"}
                    >
                        {loading ? <span className="loading loading-spinner" /> : "Simpan"}
                    </button>
                </div>
            </div>

            {/* backdrop close */}
            <form method="dialog" className="modal-backdrop" onClick={onClose}>
                <button>close</button>
            </form>
        </dialog>
    );
}
