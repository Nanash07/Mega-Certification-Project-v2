// src/components/ProfileDropdown.jsx
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown, Bell } from "lucide-react";
import { handleLogout } from "../utils/logout";

export default function ProfileDropdown() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();

    const username = localStorage.getItem("username") || "User";
    const email = localStorage.getItem("email") || "-";
    const employeeId = localStorage.getItem("employeeId");
    const role = localStorage.getItem("role");

    // Backend lo pake role PEGAWAI → jadi ini yang kita cek
    const isEmployee = role === "PEGAWAI";

    useEffect(() => {
        function handleClickOutside(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleGoProfile = () => {
        setOpen(false);

        // Pegawai boleh buka halaman dirinya sendiri
        if (role === "PEGAWAI") {
            if (!employeeId) {
                console.error("⚠ Employee login tapi employeeId NULL. Cek backend login response!");
                return;
            }
            navigate(`/employee/${employeeId}`); // ⬅ arahkan langsung ke pegawai yg login
        }
    };

    const handleGoNotifications = () => {
        setOpen(false);
        navigate("/notifications");
    };

    return (
        <div className="relative" ref={ref}>
            {/* BUTTON AVATAR */}
            <button type="button" className="flex items-center gap-2" onClick={() => setOpen((v) => !v)}>
                <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                    <User size={18} className="text-gray-600" />
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate font-medium text-gray-700">{username}</span>
                <ChevronDown size={18} className={`transition-transform text-gray-500 ${open ? "rotate-180" : ""}`} />
            </button>

            {/* DROPDOWN */}
            {open && (
                <div className="absolute right-0 mt-3 w-80 max-w-[92vw] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4">
                        <div className="font-bold text-lg text-gray-800 truncate">{username}</div>
                        <div className="text-gray-400 text-sm truncate">{email}</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {/* Main actions */}
                        <div className="py-2 px-2 space-y-1">
                            {isEmployee && (
                                <button
                                    type="button"
                                    onClick={handleGoProfile}
                                    className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                                >
                                    <User size={18} /> Profil
                                </button>
                            )}

                            {isEmployee && (
                                <button
                                    type="button"
                                    onClick={handleGoNotifications}
                                    className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                                >
                                    <Bell size={18} /> Notifikasi
                                </button>
                            )}
                        </div>

                        {/* Logout */}
                        <div className="py-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    handleLogout();
                                }}
                                className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-red-500 hover:bg-gray-50"
                            >
                                <LogOut size={18} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
