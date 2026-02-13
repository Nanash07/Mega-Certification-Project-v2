// src/components/Sidebar.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    User,
    Users,
    ListChecks,
    ChevronDown,
    ChevronUp,
    BadgeCheck,
    Bell,
    ClipboardList,
    Settings,
    UserX,
    FileCheck,
    Network,
} from "lucide-react";

// Menu structure with sections
export const MENU = [
    // ─── OVERVIEW ───
    {
        section: "OVERVIEW",
        label: "Dashboard",
        icon: <LayoutDashboard size={18} />,
        href: "/dashboard",
        key: "dashboard",
    },

    // ─── KEPEGAWAIAN ───
    {
        section: "KEPEGAWAIAN",
        label: "Data Pegawai",
        icon: <User size={18} />,
        href: "/employee/data",
        key: "data-pegawai",
    },
    {
        label: "Pegawai Nonaktif",
        icon: <UserX size={18} />,
        href: "/employee/resigned",
        key: "pegawai-nonaktif",
    },
    {
        label: "Eligibility",
        icon: <ListChecks size={18} />,
        key: "eligibility",
        subMenu: [
            { label: "Data Eligibility", href: "/employee/eligibility" },
            { label: "Eligibility Manual", href: "/employee/exception" },
        ],
    },
    {
        label: "Sertifikat Pegawai",
        icon: <BadgeCheck size={18} />,
        href: "/employee/certification",
        key: "sertifikat-pegawai",
    },

    // ─── SERTIFIKASI ───
    {
        section: "SERTIFIKASI",
        label: "Batch",
        icon: <ClipboardList size={18} />,
        href: "/batch",
        key: "batch",
    },
    {
        label: "Mapping Jabatan",
        icon: <Network size={18} />,
        href: "/mapping/job-certification",
        key: "mapping",
    },

    // ─── MASTER DATA ───
    {
        section: "MASTER DATA",
        label: "Sertifikat",
        icon: <FileCheck size={18} />,
        key: "sertifikat",
        subMenu: [
            { label: "Aturan Sertifikat", href: "/sertifikat/aturan-sertifikat" },
            { label: "Jenis", href: "/sertifikat/jenis" },
            { label: "Jenjang", href: "/sertifikat/jenjang" },
            { label: "Sub Bidang", href: "/sertifikat/sub-bidang" },
            { label: "Lembaga", href: "/sertifikat/lembaga" },
        ],
    },
    {
        label: "Organisasi",
        icon: <Users size={18} />,
        key: "organization",
        subMenu: [
            { label: "Regional", href: "/organization/regional" },
            { label: "Division", href: "/organization/division" },
            { label: "Unit", href: "/organization/unit" },
            { label: "Job Position", href: "/organization/job-position" },
        ],
    },

    // ─── PENGATURAN ───
    {
        section: "PENGATURAN",
        label: "Kelola User",
        icon: <Settings size={18} />,
        href: "/user",
        key: "user",
    },
    {
        label: "Notifikasi",
        icon: <Bell size={18} />,
        key: "notifikasi",
        subMenu: [
            { label: "Template & Jadwal", href: "/settings/notification-settings" },
            { label: "Konfigurasi Email", href: "/settings/email-config" },
            { label: "Test Koneksi Email", href: "/settings/email-test" },
            { label: "Notifikasi Terkirim", href: "/settings/notifications-sent" },
        ],
    },
];

const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
};

const normalizeRole = (roleRaw) => {
    const r = (roleRaw || "").toString().toUpperCase().trim();
    if (!r) return "";
    return r.startsWith("ROLE_") ? r.replace(/^ROLE_/, "") : r;
};

export const getCurrentRole = () => {
    const user = getStoredUser();
    const raw = user.role || localStorage.getItem("role") || "";
    return normalizeRole(raw);
};

export const filterMenuByRole = (menu, roleRaw) => {
    const role = normalizeRole(roleRaw);

    if (role === "SUPERADMIN") return menu;

    if (role === "PIC") {
        return menu
            .map((item) => {
                if (item.key === "sertifikat") {
                    return {
                        ...item,
                        subMenu: item.subMenu.filter(
                            (sub) => sub.label !== "Jenjang" && sub.label !== "Jenis" && sub.label !== "Sub Bidang"
                        ),
                    };
                }
                if (item.key === "notifikasi") {
                    return {
                        ...item,
                        subMenu: item.subMenu.filter(
                            (sub) =>
                                sub.label === "Template & Jadwal" ||
                                sub.label === "Test Koneksi Email" ||
                                sub.label === "Notifikasi Terkirim"
                        ),
                    };
                }
                return item;
            });
    }

    if (role === "PEGAWAI" || role === "EMPLOYEE") {
        const allowed = menu.filter((item) => item.key === "dashboard" || item.key === "eligibility");
        return [
            ...allowed,
            {
                section: "LAINNYA",
                label: "Notifikasi",
                icon: <Bell size={18} />,
                href: "/notifications",
                key: "notifications",
            },
        ];
    }

    return menu.filter((item) => item.key === "dashboard" || item.key === "data-pegawai" || item.key === "eligibility");
};

export default function Sidebar({ open, setOpen }) {
    const location = useLocation();
    const [openMenu, setOpenMenu] = useState("");

    const role = getCurrentRole();
    const visibleMenu = useMemo(() => filterMenuByRole(MENU, role), [role]);

    const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + "/");
    const isParentActive = (submenu) => submenu.some((sub) => isActive(sub.href));
    const isMenuActive = (item) => (item.subMenu ? isParentActive(item.subMenu) : isActive(item.href));

    useEffect(() => {
        const parent = visibleMenu.find(
            (m) => m.subMenu && m.subMenu.some((s) => location.pathname.startsWith(s.href))
        );
        setOpenMenu(parent ? parent.key : "");
    }, [location.pathname, visibleMenu]);

    const handleMenuClick = (key) => setOpenMenu((prev) => (prev === key ? "" : key));

    const handleLinkClick = () => {
        if (window.innerWidth < 1024) setOpen(false);
    };

    // Track which section we've rendered
    let lastSection = null;

    return (
        <>
            {open && <div className="fixed inset-0 z-40 lg:hidden bg-black/20" onClick={() => setOpen(false)} />}

            <aside
                className={`
          fixed z-50 top-0 left-0 h-full w-56 bg-white shadow-sm
          flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          border-r border-gray-200
          lg:translate-x-0 lg:static lg:z-auto
        `}
            >
                <div className="flex items-center h-16 px-6 border-b border-gray-200">
                    <Link to="/dashboard" className="font-bold text-2xl" onClick={handleLinkClick}>
                        Mega Certification
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto pt-4 px-2">
                    {visibleMenu.map((item, index) => {
                        // Check if we need to render a section header
                        const showSection = item.section && item.section !== lastSection;
                        if (item.section) lastSection = item.section;

                        return (
                            <div key={item.key}>
                                {/* Section Header */}
                                {showSection && (
                                    <div className={`px-3 pt-4 pb-2 ${index === 0 ? "pt-1" : ""}`}>
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                            {item.section}
                                        </span>
                                    </div>
                                )}

                                {/* Menu Item */}
                                {item.subMenu ? (
                                    <div className="mb-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMenuClick(item.key)}
                                            className={`btn btn-sm w-full justify-start gap-3 text-xs ${
                                                isMenuActive(item) ? "btn-primary" : "btn-ghost"
                                            }`}
                                        >
                                            {item.icon}
                                            <span className="flex-1 text-left text-xs">{item.label}</span>
                                            {openMenu === item.key ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>

                                        {openMenu === item.key && (
                                            <div className="ml-4 mt-1 space-y-1">
                                                {item.subMenu.map((sub) => (
                                                    <Link
                                                        key={sub.href}
                                                        to={sub.href}
                                                        className={`btn btn-sm w-full justify-start text-xs ${
                                                            isActive(sub.href) ? "btn-primary" : "btn-ghost"
                                                        }`}
                                                        onClick={handleLinkClick}
                                                    >
                                                        {sub.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mb-1">
                                        <Link
                                            to={item.href}
                                            className={`btn btn-sm w-full justify-start gap-3 text-xs ${
                                                isMenuActive(item) ? "btn-primary" : "btn-ghost"
                                            }`}
                                            onClick={handleLinkClick}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
