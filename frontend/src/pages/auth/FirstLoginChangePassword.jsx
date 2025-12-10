// src/pages/auth/FirstLoginChangePassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { changePasswordFirstLogin } from "../../services/authService";

const currentYear = new Date().getFullYear();

const FirstLoginChangePassword = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
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
        <div className="min-h-screen flex items-center justify-center bg-base-300">
            <div className="card w-full max-w-md bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body gap-4">
                    {/* HEADER */}
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-bold text-accent">Ganti Password Pertama Kali</h1>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <label className="form-control">
                            <span className="label-text font-semibold pb-1 text-base-content/70">Password Baru</span>
                            <input
                                type="password"
                                className="input input-bordered w-full"
                                placeholder="Minimal 6 karakter"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </label>

                        <div className="h-2"></div>

                        <label className="form-control">
                            <span className="label-text font-semibold pb-1 text-base-content/70">
                                Konfirmasi Password Baru
                            </span>
                            <input
                                type="password"
                                className="input input-bordered w-full"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block rounded-xl font-bold mt-4"
                            disabled={loading}
                        >
                            {loading ? "Menyimpan..." : "Simpan & Lanjut"}
                        </button>

                        {message && <p className="text-success text-center text-xs mt-1">{message}</p>}

                        {error && <p className="text-error text-center text-xs mt-1">{error}</p>}
                    </form>

                    <p className="text-xs text-base-content/60 mt-4 text-center">
                        © {currentYear} Bank Mega. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FirstLoginChangePassword;
