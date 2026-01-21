// src/pages/auth/FirstLoginChangePassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { changePasswordFirstLogin } from "../../services/authService";
import { validatePassword } from "../../utils/passwordUtils";
import PasswordRequirements from "../../components/common/PasswordRequirements";

const currentYear = new Date().getFullYear();

const FirstLoginChangePassword = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        try {
            const raw = localStorage.getItem("user");
            if (!raw) {
                navigate("/login", { replace: true });
                return;
            }

            const parsed = JSON.parse(raw);

            if (!parsed || String(parsed.role).toUpperCase() !== "PEGAWAI" || parsed.isFirstLogin !== true) {
                navigate("/dashboard", { replace: true });
                return;
            }

            setUser(parsed);
        } catch {
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!user) {
            setError("Sesi login tidak ditemukan. Silakan login ulang.");
            return;
        }

        if (!newPassword || !confirmPassword) {
            setError("Semua field wajib diisi.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password baru minimal 6 karakter.");
            return;
        }

        // Validasi password dengan aturan keamanan
        const { isValid, errors } = validatePassword(newPassword);
        if (!isValid) {
            setError(`Password tidak memenuhi syarat: ${errors.join(", ")}`);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Konfirmasi password tidak sesuai.");
            return;
        }

        try {
            setLoading(true);
            await changePasswordFirstLogin({
                username: user.username,
                newPassword,
            });

            const updatedUser = { ...user, isFirstLogin: false };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            setMessage("Password berhasil diubah. Mengalihkan ke dashboard...");
            setTimeout(() => {
                navigate("/dashboard", { replace: true });
            }, 1200);
        } catch (err) {
            const backendMsg = err?.response?.data?.message;
            setError(backendMsg || "Gagal mengubah password, coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="w-full max-w-lg bg-white shadow-xl shadow-gray-200/50 border border-gray-100 rounded-3xl overflow-hidden">
                
                {/* HERO HEADER */}
                <div className="bg-gradient-to-br from-orange-50 to-white border-b border-orange-50/50 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/pattern-bg.png')] opacity-[0.05]"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 ring-4 ring-orange-50 text-orange-500">
                            <ShieldCheck size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Amankan Akun Anda</h1>
                        <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                           Halo <b>{user.username}</b>, ini adalah login pertama Anda. Wajib mengganti password untuk keamanan.
                        </p>
                    </div>
                </div>

                <div className="p-8 sm:p-10">
                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* PASSWORD FIELD */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 block">Password Baru</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input input-bordered w-full pl-4 pr-10 h-11 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
                                    placeholder="Minimal 6 karakter"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <PasswordRequirements password={newPassword} show={newPassword.length > 0} />
                        </div>

                         {/* CONFIRM PASSWORD FIELD */}
                         <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 block">Konfirmasi Password</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input input-bordered w-full px-4 h-11 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
                                    placeholder="Ulangi password baru"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div role="alert" className="alert alert-error p-3 rounded-xl text-sm flex items-start bg-red-50 text-red-700 border-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {message && (
                            <div role="alert" className="alert alert-success p-3 rounded-xl text-sm flex items-start bg-green-50 text-green-700 border-green-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{message}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-full h-12 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all border-none"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin mr-2" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan Password Baru"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                         <p className="text-xs text-gray-400">
                            © {currentYear} Bank Mega. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirstLoginChangePassword;
