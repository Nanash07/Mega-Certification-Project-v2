// src/components/job-certification-mapping/ImportJobCertificationMappingModal.jsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  dryRunJobCertImport,
  confirmJobCertImport,
} from "../../services/jobCertificationImportService";
import { Upload, FileChartColumn, AlertTriangle, X } from "lucide-react";

export default function ImportJobCertificationMappingModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset state tiap kali modal ditutup
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  function resetState() {
    setFile(null);
    setPreview(null);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return; // 🚫 cegah nutup modal pas masih loading
    resetState();
    onClose();
  }

  // Dry Run
  async function handleDryRun() {
    if (!file) {
      toast.error("Pilih file Excel dulu");
      return;
    }
    setLoading(true);
    try {
      const res = await dryRunJobCertImport(file);
      setPreview(res);
      toast.success("File berhasil dicek");
    } catch {
      toast.error("Gagal memeriksa file");
    } finally {
      setLoading(false);
    }
  }

  // Confirm Import
  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    try {
      const res = await confirmJobCertImport(file);
      toast.success(res.message || "File berhasil diupload");
      onImported?.();
      handleClose();
    } catch {
      toast.error("Upload gagal, coba cek ulang file");
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <dialog className="modal modal-open" open={open}>
      <div className="modal-box max-w-2xl bg-base-100 shadow-2xl border border-gray-100 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                    <Upload size={20} className="text-info" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Import Mapping</h3>
                    <p className="text-xs text-gray-500">Import Job Certification Mapping dari Excel</p>
                </div>
            </div>
            <button className="btn btn-sm btn-circle btn-ghost" onClick={handleClose} disabled={loading}>
                <X size={18} />
            </button>
        </div>

        {/* Content */}
        <div className="py-5 text-sm">
            {/* File Input */}
            <div className="form-control w-full">
                <label className="label">
                    <span className="label-text font-medium text-gray-600">Pilih File Excel</span>
                </label>
                <input
                    type="file"
                    accept=".xlsx"
                    className="file-input file-input-bordered file-input-sm w-full rounded-lg"
                    onChange={(e) => setFile(e.target.files[0])}
                    disabled={loading}
                />
            </div>

            {/* Preview Result */}
            {preview && (
            <div className="mt-6">
                <h4 className="font-semibold flex items-center gap-2 mb-2 text-gray-800">
                    <FileChartColumn className="w-4 h-4" /> Hasil Pengecekan File
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>Processed: <b>{preview.processed}</b></div>
                <div>Inserted: <b className="text-green-600">{preview.inserted}</b></div>
                <div>Reactivated: <b className="text-blue-600">{preview.reactivated}</b></div>
                <div>Skipped: <b className="text-amber-500">{preview.skipped}</b></div>
                <div>Errors: <b className="text-red-600">{preview.errors}</b></div>
                </div>

                {preview.errorDetails?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-3 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-red-600">
                    <AlertTriangle className="w-4 h-4" /> Error Details:
                    </div>
                    <ul className="list-disc ml-5 mt-1 text-red-700">
                    {preview.errorDetails.map((err, idx) => (
                        <li key={idx}>{err}</li>
                    ))}
                    </ul>
                </div>
                )}
            </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
                type="button"
                className="btn btn-sm btn-ghost rounded-lg"
                onClick={handleClose}
                disabled={loading}
            >
                Batal
            </button>
            {!preview ? (
                <button
                    className="btn btn-sm btn-info rounded-lg text-white"
                    onClick={handleDryRun}
                    disabled={loading || !file}
                >
                    {loading ? <span className="loading loading-spinner loading-xs"></span> : "Cek File Dulu"}
                </button>
            ) : (
                <button
                    className="btn btn-sm btn-success rounded-lg text-white"
                    onClick={handleConfirm}
                    disabled={loading || !file}
                >
                    {loading ? <span className="loading loading-spinner loading-xs"></span> : "Lanjutkan Import"}
                </button>
            )}
        </div>
      </div>

      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button onClick={handleClose} disabled={loading}>
          close
        </button>
      </form>
    </dialog>
  );
}