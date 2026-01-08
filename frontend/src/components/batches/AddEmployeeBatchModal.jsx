import { useState } from "react";
import toast from "react-hot-toast";
import AsyncSelect from "react-select/async";
import { addEmployeesToBatchBulk, fetchEligibleEmployees } from "../../services/employeeBatchService";
import { X, UserPlus, Save, Users } from "lucide-react";

export default function AddEmployeeBatchModal({ open, onClose, batchId, onSaved }) {
    const [employees, setEmployees] = useState([]);
    const [saving, setSaving] = useState(false);

    function handleClose() {
        setEmployees([]);
        onClose();
    }

    const loadEligible = async (inputValue) => {
        try {
            const data = await fetchEligibleEmployees(batchId);
            return data
                .filter((e) =>
                    !inputValue ? true : `${e.nip} ${e.employeeName}`.toLowerCase().includes(inputValue.toLowerCase())
                )
                .map((e) => ({
                    value: e.employeeId,
                    label: `${e.nip} - ${e.employeeName}`,
                }));
        } catch {
            return [];
        }
    };

    async function handleSave() {
        if (!employees || employees.length === 0) {
            toast.error("Pilih minimal 1 pegawai");
            return;
        }
        setSaving(true);
        try {
            const ids = employees.map((emp) => emp.value);
            const res = await addEmployeesToBatchBulk(batchId, ids);

            toast.success(`${res.length} peserta berhasil ditambahkan`);
            onSaved?.();
            handleClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal menambahkan peserta");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box w-11/12 max-w-3xl bg-base-100 shadow-2xl border border-gray-100 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <UserPlus size={20} className="text-success" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Tambah Peserta</h3>
                            <p className="text-xs text-gray-500">Pilih pegawai eligible untuk batch ini</p>
                        </div>
                    </div>
                    <button
                        className="btn btn-sm btn-circle btn-ghost"
                        onClick={handleClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="py-5">
                    <div className="flex flex-col gap-2">
                        <label className="font-medium text-gray-600 flex items-center gap-1 text-sm">
                            <Users size={14} /> Pilih Pegawai Eligible
                        </label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={loadEligible}
                            value={employees}
                            onChange={setEmployees}
                            isMulti
                            placeholder="Cari pegawai berdasarkan NIP atau nama..."
                            menuPortalTarget={document.body}
                            classNamePrefix="react-select"
                            styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 999999 }),
                                control: (base) => ({
                                    ...base,
                                    minHeight: 48,
                                    borderRadius: "0.5rem",
                                    fontSize: "0.875rem",
                                }),
                                menu: (base) => ({
                                    ...base,
                                    fontSize: "0.875rem",
                                    zIndex: 999999,
                                }),
                            }}
                        />
                        <p className="text-xs text-gray-400">
                            {employees.length > 0 
                                ? `${employees.length} pegawai dipilih` 
                                : "Ketik untuk mencari pegawai yang eligible"}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                        className="btn btn-sm btn-ghost rounded-lg"
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Batal
                    </button>
                    <button
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        onClick={handleSave}
                        disabled={saving || employees.length === 0}
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

            <form method="dialog" className="modal-backdrop bg-black/50">
                <button onClick={handleClose}>close</button>
            </form>
        </dialog>
    );
}
