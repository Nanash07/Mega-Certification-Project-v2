// src/pages/auth/ResetPassword.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { resetPassword, validateResetToken } from "../../services/authService";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingToken, setCheckingToken] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    // Ambil token dari query & validasi ke backend
    useEffect(() => {
        const t = searchParams.get("token");

        if (!t) {
            // Kalau token gak ada di URL, langsung lempar ke halaman invalid
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
                // Kalau gagal validasi (misal network error), tetap anggap invalid
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
            <div className="min-h-screen flex items-center justify-center bg-base-300">
                <div className="card w-full max-w-md bg-base-100 shadow-xl rounded-2xl">
                    <div className="card-body items-center">
                        <span className="loading loading-spinner loading-lg mb-3" />
                        <p className="text-sm text-base-content/70">Memeriksa token reset password...</p>
                    </div>
                </div>
            </div>
        );
    }

    const disabled = loading || !token;

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-300">
            <div className="card w-full max-w-md bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body">
                    <h2 className="text-center text-2xl font-bold mb-2 text-primary">Reset Password</h2>

                    <p className="text-xs text-base-content/70 text-center mb-4">
                        Silakan masukkan password baru Anda.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold pb-1">Password Baru</span>
                            </label>
                            <input
                                type="password"
                                className="input input-bordered w-full"
                                placeholder="Minimal 6 karakter"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="label">
                                <span className="label-text font-semibold pb-1">Konfirmasi Password Baru</span>
                            </label>
                            <input
                                type="password"
                                className="input input-bordered w-full"
                                placeholder="Ulangi password baru"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block rounded-xl font-bold text-lg"
                            disabled={disabled}
                        >
                            {loading ? "Menyimpan..." : "Ubah Password"}
                        </button>

                        {message && <div className="text-success text-center text-xs mt-2">{message}</div>}

                        {error && <div className="text-error text-center text-xs mt-2">{error}</div>}
                    </form>

                    <div className="mt-4 flex justify-center">
                        <Link to="/login" className="link link-primary text-sm">
                            Kembali ke Login
                        </Link>
                    </div>

                    <span className="text-xs text-base-content/60 mt-6 block text-center">
                        © {new Date().getFullYear()} Bank Mega. All rights reserved.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
