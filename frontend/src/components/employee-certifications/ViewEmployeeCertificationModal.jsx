import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { X, Eye, Upload, Trash2, Download, AlertTriangle } from "lucide-react";
import { reuploadCertificationFile, deleteCertificationFile } from "../../services/employeeCertificationService";

export default function ViewEmployeeCertificationModal({ open, certId, onClose, onUpdated }) {
    const fileInputRef = useRef(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const fileUrl = `/api/employee-certifications/${certId}/file`;

    const handleReupload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            await reuploadCertificationFile(certId, file);
            toast.success("Sertifikat berhasil diunggah ulang");
            onClose();
            onUpdated?.();
        } catch {
            toast.error("Gagal mengunggah ulang sertifikat");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteCertificationFile(certId);
            toast.success("Sertifikat berhasil dihapus");
            setConfirmDelete(false);
            onClose();
            onUpdated?.();
        } catch {
            toast.error("Gagal menghapus sertifikat");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Modal Utama */}
            <dialog className="modal modal-open" open={open && !confirmDelete}>
                <div className="modal-box max-w-4xl h-[80vh] bg-base-100 shadow-2xl border border-gray-100 rounded-2xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                                <Eye size={20} className="text-info" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Lihat Sertifikat</h3>
                                <p className="text-xs text-gray-500">Preview file sertifikat</p>
                            </div>
                        </div>
                        <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Image Preview */}
                    <div className="flex-1 overflow-auto py-4">
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl p-4">
                            <img
                                src={fileUrl}
                                alt="Sertifikat"
                                className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f9fafb' width='200' height='200' rx='10' ry='10'/%3E%3Cpath d='M100 80v40m-20-20h40' stroke='%23d1d5db' stroke-width='2'/%3E%3Ctext x='50%25' y='65%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='14'%3EPreview Tidak Tersedia%3C/text%3E%3C/svg%3E";
                                }}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap justify-between gap-2 pt-4 border-t border-gray-100 flex-shrink-0">
                        <div className="flex gap-2">
                            <button
                                className="btn btn-sm btn-warning btn-soft rounded-lg gap-1"
                                onClick={() => fileInputRef.current.click()}
                                disabled={loading}
                            >
                                <Upload size={14} />
                                Unggah Ulang
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleReupload}
                            />

                            <button
                                className="btn btn-sm btn-error btn-soft rounded-lg gap-1"
                                onClick={() => setConfirmDelete(true)}
                                disabled={loading}
                            >
                                <Trash2 size={14} />
                                Hapus
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <a
                                href={`/api/employee-certifications/${certId}/file?download=true`}
                                className="btn btn-sm btn-success btn-soft rounded-lg gap-1"
                            >
                                <Download size={14} />
                                Unduh
                            </a>
                            <button className="btn btn-sm btn-ghost rounded-lg" onClick={onClose}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>

                <form method="dialog" className="modal-backdrop bg-black/50">
                    <button onClick={onClose}>close</button>
                </form>
            </dialog>

            {/* Modal Konfirmasi Hapus */}
            <dialog className="modal modal-open" open={confirmDelete}>
                <div className="modal-box max-w-sm bg-base-100 shadow-2xl border border-gray-100 rounded-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-error" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Konfirmasi Hapus</h3>
                                <p className="text-xs text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="py-4">
                        <p className="text-sm text-gray-600">
                            Apakah Anda yakin ingin menghapus sertifikat ini? File akan dihapus permanen
                            dan tidak dapat dikembalikan.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                        <button
                            className="btn btn-sm btn-ghost rounded-lg"
                            onClick={() => setConfirmDelete(false)}
                        >
                            Batal
                        </button>
                        <button
                            className="btn btn-sm btn-error rounded-lg gap-1"
                            onClick={handleDelete}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <Trash2 size={14} />
                            )}
                            {loading ? "Menghapus..." : "Hapus"}
                        </button>
                    </div>
                </div>

                <form method="dialog" className="modal-backdrop bg-black/50">
                    <button onClick={() => setConfirmDelete(false)}>close</button>
                </form>
            </dialog>
        </>
    );
}
