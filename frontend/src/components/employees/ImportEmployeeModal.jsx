import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { importEmployeesDryRun, importEmployeesConfirm } from "../../services/employeeService";
import { Upload, FileChartColumn, AlertTriangle } from "lucide-react";

export default function ImportEmployeeModal({ open, onClose, onImported }) {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [inputKey, setInputKey] = useState(Date.now());

    // Reset state tiap kali modal ditutup
    useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open]);

    function resetState() {
        setFile(null);
        setResult(null);
        setLoading(false);
        setInputKey(Date.now()); // force re-render input file
    }

    function handleClose() {
        if (loading) return; // 🚫 cegah close kalau masih loading
        resetState();
        onClose();
    }

    // Dry Run
    async function handleDryRun() {
        if (!file) {
            toast.error("Pilih file Excel dulu");
            return;
        }
        const formData = new FormData();
        formData.append("file", file);

        setLoading(true);
        try {
            const res = await importEmployeesDryRun(formData);
            setResult(res);
            toast.success("Cek data pegawai selesai");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal cek data pegawai");
        } finally {
            setLoading(false);
        }
    }

    // Confirm Import
    async function handleConfirm() {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        setLoading(true);
        try {
            const res = await importEmployeesConfirm(formData);
            toast.success("" + res.message);
            onImported?.();
            handleClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal upload data pegawai");
            setLoading(false); // kalau gagal, balikin tombol
        }
    }

    return (
        <dialog open={open} className="modal">
            <div className="modal-box max-w-2xl">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Upload Data Pegawai
                </h3>

                {/* Upload */}
                <input
                    key={inputKey}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="file-input file-input-bordered w-full"
                    disabled={loading} // 🚫 disable pilih file kalau sedang loading
                />

                {/* Dry Run Result */}
                {result && (
                    <div className="mt-4">
                        <h4 className="font-semibold flex items-center gap-2">
                            <FileChartColumn className="w-4 h-4" /> Hasil Cek Data Pegawai
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div>
                                Processed: <b>{result.processed}</b>
                            </div>
                            <div>
                                Created: <b className="text-green-600">{result.created}</b>
                            </div>
                            <div>
                                Updated: <b className="text-blue-600">{result.updated}</b>
                            </div>
                            <div>
                                Mutated: <b className="text-purple-600">{result.mutated}</b>
                            </div>
                            <div>
                                Resigned: <b className="text-red-600">{result.resigned}</b>
                            </div>
                            <div>
                                Errors: <b className="text-orange-600">{result.errors}</b>
                            </div>
                        </div>

                        {result.errorDetails?.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 mt-3 text-xs">
                                <div className="flex items-center gap-2 font-semibold text-red-600">
                                    <AlertTriangle className="w-4 h-4" /> Error Details:
                                </div>
                                <ul className="list-disc ml-5 mt-1">
                                    {result.errorDetails.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="modal-action">
                    <button
                        className="btn btn-error btn-soft"
                        onClick={handleClose}
                        disabled={loading} // 🚫 disable tombol batal
                    >
                        Batal
                    </button>
                    {!result ? (
                        <button
                            className="btn btn-info"
                            onClick={handleDryRun}
                            disabled={loading || !file} // 🔥 disable kalau belum ada file
                        >
                            {loading ? <span className="loading loading-spinner loading-sm"></span> : "Cek File"}
                        </button>
                    ) : (
                        <button
                            className="btn btn-success"
                            onClick={handleConfirm}
                            disabled={loading || !file} // 🔥 confirm juga butuh file
                        >
                            {loading ? <span className="loading loading-spinner loading-sm"></span> : "Upload File"}
                        </button>
                    )}
                </div>
            </div>
            {/* Backdrop: juga gak bisa close kalau loading */}
            <form method="dialog" className="modal-backdrop">
                <button onClick={handleClose} disabled={loading}>
                    close
                </button>
            </form>
        </dialog>
    );
}
