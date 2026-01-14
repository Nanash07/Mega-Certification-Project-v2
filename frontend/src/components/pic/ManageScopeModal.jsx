import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { X, Save, Shield, Award } from "lucide-react";
import { fetchCertifications } from "../../services/certificationService";
import { assignPicScope } from "../../services/picScopeService";

export default function ManageScopeModal({ open, onClose, user, onSaved }) {
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);

    // Hanya atur z-index menu react-select supaya muncul di atas modal
    const selectStyles = useMemo(
        () => ({
            menuPortal: (base) => ({ ...base, zIndex: 999999 }),
            menu: (base) => ({ ...base, zIndex: 999999 }),
            control: (base, state) => ({
                ...base,
                minHeight: "36px",
                fontSize: "0.875rem",
                borderRadius: "0.5rem",
                borderColor: "#d1d5db",
                boxShadow: state.isFocused ? "0 0 0 1px var(--fallback-p,oklch(var(--p)/1))" : "none",
                "&:hover": {
                    borderColor: "var(--fallback-p,oklch(var(--p)/1))",
                },
            }),
            option: (base, state) => ({
                ...base,
                padding: "8px 12px",
                fontSize: "0.875rem",
                backgroundColor: state.isFocused ? "#f3f4f6" : "white",
                color: "#1f2937",
                cursor: "pointer",
            }),
        }),
        []
    );

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
                console.error("Gagal load certifications:", e);
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
            console.error("Gagal simpan scope PIC:", e);
            toast.error("Gagal menyimpan scope PIC");
        } finally {
            setLoading(false);
        }
    }

    if (!open || !user) return null;

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box bg-base-100 shadow-2xl border border-gray-100 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Shield size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Kelola Scope PIC</h3>
                            <p className="text-xs text-gray-500">
                                Atur akses sertifikasi untuk <span className="font-semibold text-primary">{user.username}</span>
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-5 text-sm">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Award size={14} /> Sertifikasi yang diizinkan
                        </label>
                        <Select
                            isMulti
                            options={options}
                            value={selected}
                            onChange={setSelected}
                            styles={selectStyles}
                            placeholder="Pilih sertifikasi..."
                            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                            className="text-sm"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                            Total Dipilih: <b className="text-gray-600">{selected.length}</b>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        className="btn btn-sm btn-ghost rounded-lg"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        onClick={handleSave}
                        disabled={loading || !isDirty}
                        title={!isDirty ? "Tidak ada perubahan" : "Simpan perubahan"}
                    >
                        {loading ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />}
                        {loading ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>
            </div>

            {/* Backdrop */}
            <form method="dialog" className="modal-backdrop bg-black/50" onClick={onClose}>
                <button>close</button>
            </form>
        </dialog>
    );
}

