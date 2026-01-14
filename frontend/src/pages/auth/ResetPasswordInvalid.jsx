// src/pages/auth/ResetPasswordInvalid.jsx
import React from "react";
import { Link } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

const currentYear = new Date().getFullYear();

const ResetPasswordInvalid = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
             <div className="w-full max-w-lg bg-white shadow-xl shadow-gray-200/50 border border-gray-100 rounded-3xl overflow-hidden">
                
                {/* ERROR HEADER */}
                <div className="bg-red-50/80 border-b border-red-100 p-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/pattern-bg.png')] opacity-[0.05]"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 ring-4 ring-red-100 text-red-500 animate-pulse">
                            <XCircle size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Link Tidak Valid</h1>
                        <p className="text-gray-600 text-sm mt-2 max-w-xs mx-auto">
                            Link reset password ini mungkin sudah kadaluarsa atau pernah digunakan sebelumnya.
                        </p>
                    </div>
                </div>

                <div className="p-8 sm:p-10 text-center">
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        Jangan khawatir, Anda bisa meminta link baru dengan mudah. Silakan klik tombol di bawah ini.
                    </p>

                    {/* ACTION BUTTON */}
                    <Link 
                        to="/forgot-password" 
                        className="btn btn-primary w-full h-12 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all border-none flex items-center justify-center gap-2 text-base"
                    >
                        <RefreshCw size={20} />
                        Kirim Ulang Link
                    </Link>

                    {/* BACK LINK */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors gap-2 group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Kembali ke Halaman Login
                        </Link>
                    </div>

                    <div className="mt-8 -mb-4">
                         <p className="text-xs text-gray-300">
                            © {currentYear} Bank Mega.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordInvalid;
