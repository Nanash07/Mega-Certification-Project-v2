import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, Eye, EyeOff, Mail, Server, Lock, Shield, CheckCircle } from "lucide-react";
import { fetchActiveEmailConfig, createEmailConfig } from "../../services/emailConfigService";

export default function EmailConfigPage() {
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        host: "",
        port: 587,
        username: "",
        password: "",
        useTls: true,
    });

    const [activeConfig, setActiveConfig] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordChanged, setPasswordChanged] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const config = await fetchActiveEmailConfig();
            if (config) {
                setActiveConfig(config);
                setForm({
                    host: config.host || "",
                    port: config.port || 587,
                    username: config.username || "",
                    password: "",
                    useTls: config.useTls ?? true,
                });
                setPasswordChanged(false);
            }
        } catch (err) {
            toast.error("Gagal memuat konfigurasi aktif");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === "password") setPasswordChanged(true);
    };

    const handleSave = async () => {
        if (!form.host || !form.username) {
            toast.error("Host dan Email Pengirim wajib diisi");
            return;
        }

        try {
            setSaving(true);
            const payload = { ...form };
            if (!passwordChanged) delete payload.password;

            await createEmailConfig(payload);
            toast.success("Konfigurasi email berhasil disimpan dan diaktifkan");
            await loadConfig();
        } catch (err) {
            toast.error("Gagal menyimpan konfigurasi email");
            console.error(err);
        } finally {
            setSaving(false);
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
                    <h1 className="text-lg sm:text-xl font-bold">Konfigurasi Email</h1>
                    <p className="text-xs text-gray-500">Pengaturan SMTP untuk pengiriman notifikasi</p>
                </div>
                {activeConfig && (
                    <div className="flex items-center gap-2 text-xs">
                        <CheckCircle size={14} className="text-success" />
                        <span className="text-gray-500">Konfigurasi aktif tersimpan</span>
                    </div>
                )}
            </div>

            {/* Main Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                {/* Card Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Server size={20} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-base">Detail Konfigurasi SMTP</h3>
                            {activeConfig && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Terakhir diperbarui:{" "}
                                    {new Date(activeConfig.updatedAt).toLocaleString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 space-y-5">
                    {/* Server Settings */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block flex items-center gap-1">
                            <Server size={12} /> Pengaturan Server
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">SMTP Host</label>
                                <input
                                    className="input input-bordered input-sm w-full rounded-lg"
                                    placeholder="smtp.gmail.com"
                                    value={form.host}
                                    onChange={(e) => handleChange("host", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Port</label>
                                <input
                                    type="number"
                                    className="input input-bordered input-sm w-full rounded-lg"
                                    placeholder="587"
                                    value={form.port}
                                    onChange={(e) => handleChange("port", parseInt(e.target.value || "0", 10) || 0)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Enkripsi TLS</label>
                                <select
                                    className="select select-bordered select-sm w-full rounded-lg"
                                    value={String(form.useTls)}
                                    onChange={(e) => handleChange("useTls", e.target.value === "true")}
                                >
                                    <option value="true">Ya (Direkomendasikan)</option>
                                    <option value="false">Tidak</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Authentication */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block flex items-center gap-1">
                            <Lock size={12} /> Autentikasi
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Email Pengirim</label>
                                <input
                                    className="input input-bordered input-sm w-full rounded-lg"
                                    placeholder="noreply@bankmega.com"
                                    value={form.username}
                                    onChange={(e) => handleChange("username", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Password Aplikasi</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="input input-bordered input-sm w-full pr-10 rounded-lg"
                                        placeholder={
                                            activeConfig && !passwordChanged
                                                ? "Password tersimpan (tidak diubah)"
                                                : "Masukkan password aplikasi"
                                        }
                                        value={form.password}
                                        onChange={(e) => handleChange("password", e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-info/10 border border-info/20 rounded-xl p-3 flex gap-3">
                        <Shield size={18} className="text-info flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-gray-600">
                            <p className="font-medium text-gray-700 mb-1">Tips Keamanan</p>
                            <p>
                                Untuk Gmail, gunakan <b>App Password</b> bukan password akun utama. 
                                Aktifkan 2-Step Verification terlebih dahulu di pengaturan Google Account.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 sm:p-5 border-t border-gray-100 flex justify-end">
                    <button
                        className="btn btn-primary btn-sm rounded-lg flex items-center gap-2"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={14} />
                        {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
                    </button>
                </div>
            </div>
        </div>
    );
}
