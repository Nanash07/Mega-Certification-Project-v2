// src/components/Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Menu, Bell, Mail, MailOpen, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ProfileDropdown from "./ProfileDropdown";
import { fetchUnreadCount, fetchLatestNotifications, markNotificationAsRead } from "../services/notificationService";

// ====== HELPERS ======
const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
};

const getCurrentRole = () => {
    const storedUser = getStoredUser();

    return (
        storedUser.role ||
        localStorage.getItem("role") ||
        ""
    )
        .toString()
        .toUpperCase();
};

const getTypeLabel = (type) => {
    const map = {
        CERT_REMINDER: "Due",
        BATCH_NOTIFICATION: "Batch",
        EXPIRED_NOTICE: "Expired",
    };
    return map[type] || "";
};

const getTypeBadgeClass = (type) => {
    const map = {
        CERT_REMINDER: "bg-amber-100 text-amber-700",
        BATCH_NOTIFICATION: "bg-blue-100 text-blue-700",
        EXPIRED_NOTICE: "bg-red-100 text-red-700",
    };
    return map[type] || "bg-gray-100 text-gray-600";
};

const getTypeIconColor = (type) => {
    const map = {
        CERT_REMINDER: "text-amber-500",
        BATCH_NOTIFICATION: "text-blue-500",
        EXPIRED_NOTICE: "text-red-500",
    };
    return map[type] || "text-gray-400";
};

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
    });
};

const formatTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function Navbar({ onMenuClick, hideMenuButton = false }) {
    const navigate = useNavigate();

    const rawRole = getCurrentRole();
    const isEmployee = rawRole === "PEGAWAI";

    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);

    const [unreadCount, setUnreadCount] = useState(0);
    const [latest, setLatest] = useState([]);

    useEffect(() => {
        if (!isEmployee) return;

        loadNotif();

        const interval = setInterval(loadNotif, 10_000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEmployee]);

    const loadNotif = async () => {
        try {
            const [count, latestList] = await Promise.all([fetchUnreadCount(), fetchLatestNotifications(5)]);

            setUnreadCount(count || 0);
            setLatest(latestList || []);
        } catch (err) {
            console.warn("Gagal ambil notifikasi navbar", err);
        }
    };

    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const openFullNotification = async (notifId) => {
        try {
            await markNotificationAsRead(notifId);
            setLatest((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
            setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
        } catch (err) {
            console.warn("Gagal menandai notifikasi sebagai terbaca", err);
        }

        navigate(`/notifications?open=${notifId}`);
        setNotifOpen(false);
    };

    return (
        <header className="flex items-center h-16 px-4 lg:px-6 bg-white border-b border-gray-100 relative z-40">
            {/* Hamburger */}
            {!hideMenuButton && (
                <button 
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors lg:hidden" 
                    onClick={onMenuClick}
                >
                    <Menu size={20} className="text-gray-500" />
                </button>
            )}

            {/* Brand for Employee (No Sidebar) */}
            {isEmployee && (
                <div className="flex items-center ml-0">
                    <span className="font-bold text-xl">Mega Certification</span>
                </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
                {/* 🔔 Notification Button (Pegawai Only) */}
                {isEmployee && (
                    <div className="relative" ref={notifRef}>
                        <button
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors relative"
                            onClick={() => setNotifOpen((v) => !v)}
                        >
                            <Bell size={20} className="text-gray-500" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full ring-2 ring-white flex items-center justify-center">
                                    <span className="text-[11px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>
                                </span>
                            )}
                        </button>

                        {notifOpen && (
                            <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                                {/* Header */}
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <div className="flex items-center gap-2">
                                        <Bell size={18} className="text-primary" />
                                        <span className="font-semibold text-gray-800">Notifikasi</span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{unreadCount} baru</span>
                                    )}
                                </div>

                                {/* List */}
                                <div className="max-h-[360px] overflow-y-auto">
                                    {latest.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                            <Bell size={36} className="mb-2 opacity-30" />
                                            <p className="text-sm">Tidak ada notifikasi</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {latest.map((n) => (
                                                <button
                                                    key={n.id}
                                                    onClick={() => openFullNotification(n.id)}
                                                    className={`w-full text-left p-3.5 hover:bg-gray-50 transition-all flex gap-3 group ${
                                                        !n.read ? "bg-primary/5" : ""
                                                    }`}
                                                >
                                                    {/* Icon */}
                                                    <div className="flex-shrink-0 relative pt-0.5">
                                                        {!n.read ? (
                                                            <Mail size={18} className={getTypeIconColor(n.type)} />
                                                        ) : (
                                                            <MailOpen size={18} className="text-gray-300" />
                                                        )}
                                                        {!n.read && (
                                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full ring-1 ring-white" />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`text-sm line-clamp-1 ${
                                                            !n.read ? "font-semibold text-gray-900" : "font-medium text-gray-600"
                                                        }`}>
                                                            {n.title}
                                                        </h4>
                                                        
                                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                            {n.message}
                                                        </p>

                                                        <div className="flex items-center gap-2 mt-1">
                                                            {getTypeLabel(n.type) && (
                                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getTypeBadgeClass(n.type)}`}>
                                                                    {getTypeLabel(n.type)}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {formatDate(n.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Arrow on hover */}
                                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                                        <ArrowRight size={14} className="text-gray-400" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <button
                                    className="w-full py-3 text-center text-primary text-sm font-medium hover:bg-primary/5 transition-colors border-t border-gray-100 flex items-center justify-center gap-1.5"
                                    onClick={() => {
                                        navigate("/notifications");
                                        setNotifOpen(false);
                                    }}
                                >
                                    Lihat Semua
                                    <ArrowRight size={14} />
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
