import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Send, Mail, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { fetchActiveEmailConfig, testEmailConnection } from "../../services/emailConfigService";

const DEFAULT_TEST_BODY = `Halo,

Ini adalah email percobaan dari sistem sertifikasi Bank Mega.
Kalau Anda menerima email ini, berarti konfigurasi SMTP sudah berfungsi dengan baik.

Salam,
Divisi Learning & Development
Bank Mega`;

export default function EmailTestPage() {
    const [loading, setLoading] = useState(true);
    const [activeConfig, setActiveConfig] = useState(null);
    const [testEmail, setTestEmail] = useState("");
    const [testSubject, setTestSubject] = useState("Test Koneksi Email - Mega Certification");
    const [testBody, setTestBody] = useState(DEFAULT_TEST_BODY);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const config = await fetchActiveEmailConfig();
            setActiveConfig(config || null);

            setTestBody(DEFAULT_TEST_BODY);
            setTestSubject("Test Koneksi Email - Mega Certification");
        } catch {
            toast.error("Gagal memuat konfigurasi email");
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        if (!testEmail) {
            toast.error("Masukkan email tujuan");
            return;
        }
        if (!activeConfig) {
            toast.error("Konfigurasi email belum tersedia");
            return;
        }

        try {
            setTesting(true);
            const res = await testEmailConnection(testEmail, testSubject, testBody);
            toast.success(res || "Email test berhasil dikirim");
        } catch {
            toast.error("Gagal mengirim email test");
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-dots loading-lg text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Test Koneksi Email</h1>
                    <p className="text-xs text-gray-500">Kirim email percobaan untuk verifikasi konfigurasi SMTP</p>
                </div>
            </div>

            {/* Config Status Alert */}
            {!activeConfig ? (
                <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle size={20} className="text-error flex-shrink-0" />
                    <div className="text-sm">
                        <p className="font-medium text-error">Konfigurasi Email Belum Tersedia</p>
                        <p className="text-gray-600 text-xs mt-1">
                            Silakan atur konfigurasi SMTP terlebih dahulu di menu <b>Konfigurasi Email</b>.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-success/10 border border-success/20 rounded-xl p-3 flex gap-3 items-center">
                    <CheckCircle size={18} className="text-success flex-shrink-0" />
                    <div className="text-xs">
                        <span className="text-gray-600">Menggunakan konfigurasi: </span>
                        <span className="font-medium text-gray-800">{activeConfig.username}</span>
                        <span className="text-gray-500"> via {activeConfig.host}:{activeConfig.port}</span>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 sm:p-5 space-y-4">
                    {/* Subject */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block flex items-center gap-1">
                            <FileText size={12} /> Subject Email
                        </label>
                        <input
                            className="input input-bordered input-sm w-full rounded-lg"
                            placeholder="Subject email"
                            value={testSubject}
                            onChange={(e) => setTestSubject(e.target.value)}
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block flex items-center gap-1">
                            <Mail size={12} /> Isi Email
                        </label>
                        <textarea
                            className="textarea textarea-bordered w-full text-sm min-h-[180px] rounded-lg resize-none"
                            value={testBody}
                            onChange={(e) => setTestBody(e.target.value)}
                            placeholder="Tulis isi email test..."
                        />
                    </div>

                    {/* Email Target + Send Button */}
                    <div className="border border-gray-200 rounded-xl p-4">
                        <label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1">
                            <Send size={12} /> Email Tujuan
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <input
                                    type="email"
                                    className="input input-bordered input-sm w-full rounded-lg bg-white"
                                    placeholder="contoh: user@bankmega.co.id"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                />
                            </div>
                            <button
                                className="btn btn-primary btn-sm rounded-lg w-full flex items-center justify-center gap-2"
                                onClick={handleTest}
                                disabled={testing || !activeConfig}
                            >
                                {testing ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs" />
                                        Mengirim...
                                    </>
                                ) : (
                                    <>
                                        <Send size={14} />
                                        Kirim Test
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
