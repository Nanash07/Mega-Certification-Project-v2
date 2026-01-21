import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X, Eye, Upload, Trash2, Download, AlertTriangle, FileText } from "lucide-react";
import { reuploadCertificationFile, deleteCertificationFile } from "../../services/employeeCertificationService";

export default function ViewEmployeeCertificationModal({ open, certId, onClose, onUpdated }) {
    const fileInputRef = useRef(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileType, setFileType] = useState('image'); // 'pdf', 'image'
    const [fileError, setFileError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const fileUrl = `/api/employee-certifications/${certId}/file`;

    // Reset state when modal opens/closes
    useEffect(() => {
        if (open && certId) {
            setConfirmDelete(false);
            setFileError(false);
            setFileType('image'); // Default to image first
            setImageLoaded(false);
        }
    }, [open, certId]);

    const handleImageLoad = () => {
        setImageLoaded(true);
        setFileError(false);
    };

    const handleImageError = () => {
        // If image fails, try PDF
        if (fileType === 'image' && !imageLoaded) {
            setFileType('pdf');
        } else {
            // Both failed
            setFileError(true);
        }
    };

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

    const handleClose = () => {
        setConfirmDelete(false);
        onClose();
    };

    if (!open) return null;

    // Modal Konfirmasi Hapus
    if (confirmDelete) {
        return (
            <dialog className="modal modal-open">
                <div className="modal-box max-w-sm">
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
                            className="btn btn-sm btn-ghost rounded-lg border border-gray-200"
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

                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setConfirmDelete(false)}>close</button>
                </form>
            </dialog>
        );
    }

    // Modal Utama - Lihat Sertifikat
    return (
        <dialog className="modal modal-open">
            <div className="modal-box max-w-4xl h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                            <Eye size={20} className="text-info" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Lihat Sertifikat</h3>
                            <p className="text-xs text-gray-500">
                                {fileError ? 'File tidak tersedia' : fileType === 'pdf' ? 'Dokumen PDF' : 'Gambar Sertifikat'}
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={handleClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto py-4 min-h-0">
                    <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-xl overflow-auto p-4">
                        {fileError ? (
                            // Error State
                            <div className="flex flex-col items-center justify-center text-gray-400 p-8">
                                <FileText size={64} className="mb-4 opacity-30" />
                                <p className="text-sm font-medium mb-2">Preview Tidak Tersedia</p>
                                <p className="text-xs text-center mb-4">File tidak dapat ditampilkan atau tidak ada.</p>
                                <div className="flex gap-2">
                                    <a
                                        href={`${fileUrl}?download=true`}
                                        className="btn btn-sm btn-primary rounded-lg gap-1"
                                        download
                                    >
                                        <Download size={14} />
                                        Coba Unduh
                                    </a>
                                </div>
                            </div>
                        ) : fileType === 'pdf' ? (
                            // PDF Preview
                            <iframe
                                src={`${fileUrl}#toolbar=1&navpanes=0`}
                                className="w-full h-full rounded-lg border-0"
                                title="PDF Sertifikat"
                                onError={() => setFileError(true)}
                            />
                        ) : (
                            // Image Preview (supports jpg, png, gif, webp, etc)
                            <div className="relative w-full h-full flex items-center justify-center">
                                {!imageLoaded && !fileError && (
                                    <div className="absolute flex flex-col items-center justify-center text-gray-400">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                        <p className="text-sm mt-3">Memuat gambar...</p>
                                    </div>
                                )}
                                <img
                                    src={`${fileUrl}?t=${Date.now()}`}
                                    alt="Sertifikat"
                                    className={`w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-lg transition-opacity duration-300 ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
                                    style={{ minWidth: '200px', minHeight: '200px' }}
                                    onLoad={handleImageLoad}
                                    onError={handleImageError}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap justify-between gap-2 pt-4 border-t border-gray-100 flex-shrink-0">
                    <div className="flex gap-2">
                        <button
                            className="btn btn-sm btn-warning rounded-lg gap-1"
                            onClick={() => fileInputRef.current.click()}
                            disabled={loading}
                        >
                            <Upload size={14} />
                            Unggah Ulang
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={handleReupload}
                        />

                        <button
                            className="btn btn-sm btn-error rounded-lg gap-1"
                            onClick={() => setConfirmDelete(true)}
                            disabled={loading}
                        >
                            <Trash2 size={14} />
                            Hapus
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <a
                            href={`${fileUrl}?download=true`}
                            className="btn btn-sm btn-success rounded-lg gap-1"
                            download
                        >
                            <Download size={14} />
                            Unduh
                        </a>
                        <button className="btn btn-sm btn-ghost rounded-lg border border-gray-200" onClick={handleClose}>
                            Tutup
                        </button>
                    </div>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={handleClose}>close</button>
            </form>
        </dialog>
    );
}
