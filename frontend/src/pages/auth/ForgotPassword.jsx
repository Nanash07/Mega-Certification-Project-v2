import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound, Loader2 } from "lucide-react";
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="w-full max-w-md bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
                <div className="p-8">
                    {/* HEADER */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                            <KeyRound size={28} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Lupa Password?</h1>
                        <p className="text-gray-500 text-sm mt-2">
                            Masukkan email atau username Anda untuk menerima instruksi reset password.
                        </p>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* IDENTIFIER */}
                         <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 block">Email atau Username</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    className="input input-bordered w-full px-4 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
                                    placeholder="contoh@bankmega.com"
                                    required
                                    autoFocus
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* BUTTON */}
                        <button
                            type="submit"
                            className="btn btn-primary w-full rounded-lg font-bold shadow-sm hover:shadow-md transition-all border-none"
                            disabled={loading || !identifier}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin mr-2" />
                                    Mengirim...
                                </>
                            ) : (
                                "Kirim Link Reset"
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
                
                 {/* FOOTER INSIDE CARD */}
                <div className="bg-gray-50/50 p-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                        © {currentYear} PT Bank Mega Tbk.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
