import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  dryRunImportExceptions,
  confirmImportExceptions,
} from "../../services/employeeExceptionService";
import { Upload, FileChartColumn, AlertTriangle } from "lucide-react";

export default function ImportExceptionModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset state tiap kali modal ditutup/buka ulang
  useEffect(() => {
    if (!open) resetState();
  }, [open]);

  function resetState() {
    setFile(null);
    setPreview(null);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return; // 🚫 cegah nutup pas masih loading
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
      const res = await dryRunImportExceptions(file);
      setPreview(res);
      toast.success("File berhasil dicek");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal memeriksa file");
    } finally {
      setLoading(false);
    }
  }

  // Confirm Import
  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    try {
      const res = await confirmImportExceptions(file);
      toast.success(res.message || "Import berhasil");
      onImported?.();
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Import gagal");
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5" /> Import Exception Pegawai
        </h3>

        {/* File Input */}
        <input
          type="file"
          accept=".xlsx"
          className="file-input file-input-bordered w-full"
          onChange={(e) => setFile(e.target.files[0])}
          disabled={loading}
        />

        {/* Preview */}
        {preview && (
          <div className="mt-4">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <FileChartColumn className="w-4 h-4" /> Hasil Pengecekan File
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Processed: <b>{preview.processed}</b></div>
              <div>Created: <b className="text-green-600">{preview.created}</b></div>
              <div>Updated: <b className="text-blue-600">{preview.updated}</b></div>
              <div>Deactivated: <b className="text-amber-500">{preview.deactivated}</b></div>
              <div>Errors: <b className="text-red-600">{preview.errors}</b></div>
            </div>

            {preview.errorDetails?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-2 mt-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-red-600">
                  <AlertTriangle className="w-4 h-4" /> Error Details:
                </div>
                <ul className="list-disc ml-5 mt-1">
                  {preview.errorDetails.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="modal-action">
          <button
            className="btn btn-sm btn-ghost rounded-lg border border-gray-200"
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </button>
          {!preview ? (
            <button
              className="btn btn-info"
              onClick={handleDryRun}
              disabled={loading || !file}
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : "Cek File Dulu"}
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={handleConfirm}
              disabled={loading || !file}
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : "Lanjutkan Import"}
            </button>
          )}
        </div>
      </div>

      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose} disabled={loading}>
          close
        </button>
      </form>
    </dialog>
  );
}