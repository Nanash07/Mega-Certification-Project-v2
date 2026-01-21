// src/pages/auth/ResetPassword.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { resetPassword, validateResetToken } from "../../services/authService";
import { validatePassword } from "../../utils/passwordUtils";
import PasswordRequirements from "../../components/common/PasswordRequirements";

const currentYear = new Date().getFullYear();

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [checkingToken, setCheckingToken] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    // Ambil token dari query & validasi ke backend
    useEffect(() => {
        const t = searchParams.get("token");

        if (!t) {
            navigate("/reset-password/invalid", { replace: true });
            return;
        }

        setToken(t);

        const checkToken = async () => {
            try {
                const valid = await validateResetToken(t);
                if (!valid) {
                    navigate("/reset-password/invalid", { replace: true });
                    return;
                }
                setCheckingToken(false);
            } catch (e) {
                console.error("validateResetToken error:", e);
                navigate("/reset-password/invalid", { replace: true });
            }
        };

        checkToken();
    }, [searchParams, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!newPassword || !confirmPassword) {
            setError("Password baru dan konfirmasi wajib diisi.");
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

        setLoading(true);
        try {
            await resetPassword({ token, newPassword });
            setMessage("Password berhasil diubah. Mengalihkan ke halaman login...");
            // Redirect ke login setelah 2 detik
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            console.error("resetPassword error:", err);
            const backendMsg = err?.response?.data?.message;
            setError(backendMsg || "Gagal mengubah password. Coba beberapa saat lagi.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="text-primary animate-spin" />
                    <p className="text-gray-500 font-medium">Memeriksa token reset password...</p>
                </div>
            </div>
        );
    }

    const disabled = loading || !token;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="w-full max-w-md bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
                <div className="p-8">
                    {/* HEADER */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                            <KeyRound size={28} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Reset Password</h1>
                        <p className="text-gray-500 text-sm mt-2">
                           Silakan buat password baru untuk akun Anda.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* PASSWORD FIELD */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 block">Password Baru</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input input-bordered w-full pl-4 pr-10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
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
                         <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 block">Konfirmasi Password</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input input-bordered w-full px-4 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"

                                    placeholder="Ulangi password baru"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>


                        <button
                            type="submit"
                            className="btn btn-primary w-full rounded-lg font-bold shadow-sm hover:shadow-md transition-all border-none"
                            disabled={disabled}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin mr-2" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Ubah Password"
                            )}
                        </button>

                         {/* SUCCESS MESSAGE */}
                         {message && (
                            <div role="alert" className="alert alert-success p-3 rounded-lg text-sm flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{message}</span>
                            </div>
                        )}

                        {/* ERROR MESSAGE */}
                        {error && (
                            <div role="alert" className="alert alert-error p-3 rounded-lg text-sm flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{error}</span>
                            </div>
                        )}
                    </form>

                     {/* LINK BACK TO LOGIN */}
                     <div className="mt-8 text-center border-t border-gray-100 pt-6">
                        <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors gap-2 group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Kembali ke Login
                        </Link>
                    </div>
                </div>

                 {/* FOOTER */}
                 <div className="bg-gray-50/50 p-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                        © {currentYear} PT Bank Mega Tbk.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
