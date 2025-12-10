import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../services/authService";

const currentYear = new Date().getFullYear();

const ForgotPassword = () => {
    const [identifier, setIdentifier] = useState(""); // email / username
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);

        try {
            const res = await forgotPassword({
                email: identifier.includes("@") ? identifier : null,
                username: !identifier.includes("@") ? identifier : null,
            });

            if (res?.success) {
                // akun ketemu
                setMessage(res.message || "Akun ditemukan, email telah dikirim.");
            } else {
                // akun tidak ketemu (tapi HTTP 200)
                setError(res?.message || "Akun tidak ditemukan.");
            }
        } catch (err) {
            const backendMessage = err?.response?.data?.message;
            setError(backendMessage || "Terjadi kesalahan, coba beberapa saat lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-300">
            <div className="card w-full max-w-md bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body gap-4">
                    {/* HEADER */}
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-bold text-accent">Forgot Password</h1>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* IDENTIFIER */}
                        <label className="form-control">
                            <span className="label-text font-semibold pb-1 text-base-content/70">
                                Email atau Username
                            </span>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Masukkan email atau username"
                                required
                                autoFocus
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </label>

                        <div className="h-2"></div>

                        {/* BUTTON */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-block rounded-xl font-bold"
                            disabled={loading || !identifier}
                        >
                            {loading ? "Mengirim..." : "Kirim Reset Password"}
                        </button>

                        {/* SUCCESS / ERROR MESSAGE */}
                        {message && <p className="text-success text-center text-xs mt-1">{message}</p>}

                        {error && <p className="text-error text-center text-xs mt-1">{error}</p>}
                    </form>

                    {/* LINK BACK TO LOGIN */}
                    <div className="text-center">
                        <Link to="/login" className="link link-primary text-sm">
                            Kembali ke Login
                        </Link>
                    </div>

                    {/* FOOTER */}
                    <p className="text-xs text-base-content/60 text-center">
                        © {currentYear} Bank Mega. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
