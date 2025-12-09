import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, Eye, EyeOff } from "lucide-react";
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
                <span className="loading loading-dots loading-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="card bg-base-100 shadow p-5 space-y-5">
                <div>
                    <h3 className="font-semibold text-lg">Detail Konfigurasi</h3>
                    {activeConfig && (
                        <div className="text-xs text-gray-400 mt-1">
                            Terakhir diperbarui:{" "}
                            {new Date(activeConfig.updatedAt).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    )}
                </div>

                {/* Baris 1: Host - Port - TLS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                        <label className="text-gray-500 mb-1 block">SMTP Host</label>
                        <input
                            className="input input-bordered w-full text-xs"
                            placeholder="smtp.gmail.com"
                            value={form.host}
                            onChange={(e) => handleChange("host", e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-gray-500 mb-1 block">Port</label>
                        <input
                            type="number"
                            className="input input-bordered w-full text-xs"
                            placeholder="587"
                            value={form.port}
                            onChange={(e) => handleChange("port", parseInt(e.target.value || "0", 10) || 0)}
                        />
                    </div>

                    <div>
                        <label className="text-gray-500 mb-1 block">Gunakan TLS</label>
                        <select
                            className="select select-bordered w-full text-xs"
                            value={String(form.useTls)}
                            onChange={(e) => handleChange("useTls", e.target.value === "true")}
                        >
                            <option value="true">Ya</option>
                            <option value="false">Tidak</option>
                        </select>
                    </div>
                </div>

                {/* Baris 2: Username - Password - Simpan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs items-end">
                    <div>
                        <label className="text-gray-500 mb-1 block">Email Pengirim</label>
                        <input
                            className="input input-bordered w-full text-xs"
                            placeholder="contoh@gmail.com"
                            value={form.username}
                            onChange={(e) => handleChange("username", e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <label className="text-gray-500 mb-1 block">Password Aplikasi</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input input-bordered w-full pr-10 text-xs"
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
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword((prev) => !prev)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex">
                        <button
                            className="btn btn-warning w-full flex items-center justify-center gap-2 text-xs"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <Save size={16} />
                            {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
