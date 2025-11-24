// src/components/Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Menu, Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import ProfileDropdown from "./ProfileDropdown";
import { fetchUnreadCount, fetchLatestNotifications } from "../services/notificationService";
import { MENU, filterMenuByRole } from "./Sidebar";

// Ambil title dari menu yang sudah difilter by role
const getMenuTitle = (pathname, menu) => {
    // flatten menu + submenu jadi satu list
    const flat = menu.flatMap((item) =>
        item.subMenu
            ? item.subMenu.map((sub) => ({
                  ...sub,
                  // kalau perlu tau parent, bisa simpan: parentKey: item.key
              }))
            : [item]
    );

    const match = flat.find((entry) => pathname === entry.href || pathname.startsWith(entry.href + "/"));

    return match?.label || "Dashboard";
};

export default function Navbar({ onMenuClick }) {
    const navigate = useNavigate();
    const location = useLocation();

    // 🔐 Ambil role dengan cara yang sama kayak Sidebar
    const rawRole = (JSON.parse(localStorage.getItem("user") || "{}").role || localStorage.getItem("role") || "")
        .toString()
        .toUpperCase();

    const visibleMenu = filterMenuByRole(MENU, rawRole);
    const title = getMenuTitle(location.pathname, visibleMenu);

    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);

    const [unreadCount, setUnreadCount] = useState(0);
    const [latest, setLatest] = useState([]);

    // support EMPLOYEE/PEGAWAI (jaga-jaga backend campur bahasa)
    const isEmployee = rawRole === "EMPLOYEE" || rawRole === "PEGAWAI";

    useEffect(() => {
        if (!isEmployee) return;

        loadNotif();

        const interval = setInterval(loadNotif, 10_000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEmployee]);

    const loadNotif = async () => {
        try {
            const count = await fetchUnreadCount();
            const latestList = await fetchLatestNotifications(5);

            setUnreadCount(count || 0);
            setLatest(latestList || []);
        } catch {
            console.warn("Gagal ambil notifikasi navbar");
        }
    };

    // Close dropdown if outside click
    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const openFullNotification = (notifId) => {
        navigate(`/notifications?open=${notifId}`);
        setNotifOpen(false);
    };

    return (
        <header className="flex items-center h-20 px-4 lg:px-8 bg-white border-b border-gray-200 relative z-40">
            {/* Hamburger */}
            <button className="btn btn-ghost btn-square border border-gray-200 lg:hidden" onClick={onMenuClick}>
                <Menu size={24} className="text-gray-400" />
            </button>

            {/* Page Title */}
            <h1 className="ml-4 font-bold text-base sm:text-lg md:text-xl lg:text-2xl truncate max-w-[70%]">{title}</h1>

            <div className="flex items-center gap-4 ml-auto">
                {/* 🔔 Notification Button (Pegawai Only) */}
                {isEmployee && (
                    <div className="relative" ref={notifRef}>
                        <button
                            className="btn btn-ghost btn-circle border border-gray-200 relative"
                            onClick={() => setNotifOpen((v) => !v)}
                        >
                            <Bell size={22} className="text-gray-500" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white" />
                            )}
                        </button>

                        {/* 🔽 PREVIEW DROPDOWN */}
                        {notifOpen && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                <div className="px-6 pt-4 pb-2 font-bold text-lg">Notifikasi</div>

                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                                    {latest.length === 0 ? (
                                        <p className="p-4 text-sm text-gray-400">Tidak ada notifikasi</p>
                                    ) : (
                                        latest.map((n) => (
                                            <button
                                                key={n.id}
                                                onClick={() => openFullNotification(n.id)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col"
                                            >
                                                <div className="font-semibold text-sm">{n.title}</div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(n.createdAt).toLocaleDateString("id-ID")}
                                                </div>
                                                <div className="text-xs text-gray-600 line-clamp-2">{n.message}</div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button
                                    className="w-full py-3 text-center text-primary text-sm font-medium hover:bg-gray-50"
                                    onClick={() => {
                                        navigate("/notifications");
                                        setNotifOpen(false);
                                    }}
                                >
                                    Lihat Semua
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 👤 Profile Dropdown */}
                <ProfileDropdown />
            </div>
        </header>
    );
}
