import { useState } from "react";
import toast from "react-hot-toast";
import { X, Upload, FileImage, CloudUpload } from "lucide-react";
import { uploadCertificationFile } from "../../services/employeeCertificationService";

export default function UploadCertificationModal({ open, onClose, certId, onUploaded }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleUpload = async () => {
        if (!file) {
            toast.error("Pilih file terlebih dahulu");
            return;
        }

        try {
            setLoading(true);
            await uploadCertificationFile(certId, file);
            toast.success("Upload sertifikat berhasil");
            onUploaded();
            onClose();
        } catch {
            toast.error("Gagal upload sertifikat");
        } finally {
            setLoading(false);
            setFile(null);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    if (!open) return null;

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-md bg-base-100 shadow-2xl border border-gray-100 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <Upload size={20} className="text-success" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Upload Sertifikat</h3>
                            <p className="text-xs text-gray-500">Unggah file gambar sertifikat</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-5">
                    {/* Drag & Drop Area */}
                    <div
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                            dragActive
                                ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                                : file
                                ? "border-success bg-success/5"
                                : "border-gray-300 hover:border-primary hover:bg-primary/5 hover:shadow-sm"
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("file-upload-input").click()}
                    >
                        <input
                            id="file-upload-input"
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="hidden"
                        />
                        {file ? (
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto">
                                    <FileImage size={24} className="text-success" />
                                </div>
                                <p className="font-medium text-gray-700 text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                                <button
                                    type="button"
                                    className="text-xs text-error hover:underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                    }}
                                >
                                    Hapus file
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto">
                                    <CloudUpload size={24} className="text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700 text-sm">
                                        Drag & drop file di sini
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        atau klik untuk memilih file
                                    </p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Format: JPG, JPEG, PNG
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button className="btn btn-sm btn-ghost rounded-lg" onClick={onClose}>
                        Batal
                    </button>
                    <button
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        onClick={handleUpload}
                        disabled={loading || !file}
                    >
                        {loading ? (
                            <span className="loading loading-spinner loading-xs" />
                        ) : (
                            <Upload size={14} />
                        )}
                        {loading ? "Mengupload..." : "Upload"}
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop bg-black/50">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
