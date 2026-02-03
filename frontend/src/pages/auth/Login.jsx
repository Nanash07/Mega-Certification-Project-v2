import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "../../services/authService";

const currentYear = new Date().getFullYear();

const Login = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await login({
                username: form.username.trim(),
                password: form.password,
            });

            localStorage.setItem("token", res.token);

            const userPayload = {
                id: res.id ?? null,
                username: res.username ?? "",
                email: res.email ?? "",
                role: res.role ?? null,
                employeeId: res.employeeId ?? null,
                isFirstLogin: res.isFirstLogin ?? false,
            };
            localStorage.setItem("user", JSON.stringify(userPayload));

            if (userPayload.isFirstLogin) {
                navigate("/first-login/change-password", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        } catch (err) {
            const msg =
                err?.response?.data?.message || err?.response?.data?.error || "Login gagal. Cek username/password!";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
            
            {/* Left Side - Brand Section (Clean & Soft) */}
            <div className="hidden lg:flex w-1/2 bg-orange-50 relative flex-col items-center justify-center p-12">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/pattern-bg.png')] opacity-[0.03]"></div>
                {/* Decorative Blurs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-200/30 rounded-full blur-[100px]"></div>

                <div className="relative z-10 text-center">
                    <div className="bg-white p-8 rounded-3xl shadow-lg shadow-orange-100/50 border border-orange-50 mb-8 inline-block transform hover:scale-105 transition-transform duration-500">
                        <img src="/BankMega.png" alt="Bank Mega Logo" className="h-20 w-auto object-contain" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Mega Certification</h1>
                    <p className="text-gray-500 text-lg leading-relaxed max-w-md mx-auto">
                        Sistem Manajemen Sertifikasi Bank Mega.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-white relative">
                 {/* Mobile Logo */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
                    <img src="/BankMega.png" alt="Bank Mega" className="h-10 w-auto object-contain" />
                    <span className="text-xl font-bold text-gray-900 tracking-tight">MegaCertification</span>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-left">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Selamat Datang</h2>
                        <p className="text-base text-gray-500 mt-2">Masuk untuk mengelola data sertifikasi.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* USERNAME */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 block">Username</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    className="input input-bordered w-full px-4 h-12 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
                                    placeholder="Masukkan username"
                                    autoFocus
                                    required
                                    value={form.username}
                                    onChange={handleChange("username")}
                                />
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 block">Password</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input input-bordered w-full pl-4 pr-10 h-12 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
                                    placeholder="Masukkan password"
                                    required
                                    value={form.password}
                                    onChange={handleChange("password")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* FORGOT PASSWORD */}
                        <div className="flex items-center justify-end">
                            <Link 
                                to="/forgot-password" 
                                className="text-sm font-medium text-gray-500 hover:text-primary transition-colors"
                            >
                                Lupa Password?
                            </Link>
                        </div>

                        {/* ERROR ALERT */}
                        {error && (
                            <div role="alert" className="alert alert-error p-3 rounded-xl text-sm flex items-start bg-red-50 text-red-700 border-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            className="btn btn-primary w-full h-12 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all border-none text-lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin mr-2" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-8">
                        <p className="text-xs text-gray-400">
                            &copy; {currentYear} PT Bank Mega Tbk. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
