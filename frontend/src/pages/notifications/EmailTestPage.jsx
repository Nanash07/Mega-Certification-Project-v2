import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
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
                <span className="loading loading-dots loading-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow p-5 space-y-5 text-sm">
                <h1 className="text-xl font-semibold">Test Koneksi Email</h1>

                {/* SUBJECT */}
                <div className="space-y-1">
                    <label className="font-semibold text-black text-sm">Subject</label>
                    <input
                        className="input input-bordered w-full text-sm"
                        placeholder="Subject email"
                        value={testSubject}
                        onChange={(e) => setTestSubject(e.target.value)}
                    />
                </div>

                {/* BODY */}
                <div className="space-y-1">
                    <label className="font-semibold text-black text-sm">Isi Email Test</label>
                    <textarea
                        className="textarea textarea-bordered w-full text-sm min-h-[200px]"
                        value={testBody}
                        onChange={(e) => setTestBody(e.target.value)}
                        placeholder="Tulis isi email test..."
                    />
                </div>

                {/* EMAIL TUJUAN */}
                <div className="space-y-1">
                    <label className="font-semibold text-black text-sm">Email Tujuan</label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                        <div className="sm:col-span-2">
                            <input
                                type="email"
                                className="input input-bordered w-full text-sm"
                                placeholder="contoh: user@bankmega.co.id"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                            />
                        </div>

                        <button
                            className="btn btn-accent w-full flex items-center justify-center gap-2 text-sm"
                            onClick={handleTest}
                            disabled={testing}
                        >
                            <Send size={16} />
                            {testing ? "Mengirim..." : "Kirim Test"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
