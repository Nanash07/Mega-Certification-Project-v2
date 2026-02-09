import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import { Eraser, Send, Calendar, Filter, Mail, MailOpen, Clock, User } from "lucide-react";

import { fetchSentNotificationsPaged } from "../../services/notificationService";
import Pagination from "../../components/common/Pagination";

const TABS = [
    { id: "ALL", label: "Semua", icon: Send },
    { id: "CERT_REMINDER", label: "Due Reminder", color: "warning" },
    { id: "BATCH_NOTIFICATION", label: "Batch Reminder", color: "info" },
    { id: "EXPIRED_NOTICE", label: "Expired Reminder", color: "error" },
];

const STATUS_OPTIONS = [
    { value: "", label: "Semua Status" },
    { value: "UNREAD", label: "Belum Dibaca" },
    { value: "READ", label: "Sudah Dibaca" },
];

const selectStyles = {
    control: (base) => ({
        ...base,
        minHeight: '32px',
        height: '32px',
        fontSize: '12px',
    }),
    valueContainer: (base) => ({
        ...base,
        height: '32px',
        padding: '0 8px',
    }),
    input: (base) => ({
        ...base,
        margin: '0px',
        padding: '0px',
    }),
    indicatorsContainer: (base) => ({
        ...base,
        height: '32px',
    }),
    dropdownIndicator: (base) => ({
        ...base,
        padding: '4px',
    }),
    clearIndicator: (base) => ({
        ...base,
        padding: '4px',
    }),
    option: (base) => ({
        ...base,
        fontSize: '12px',
        padding: '6px 10px',
    }),
    menu: (base) => ({
        ...base,
        fontSize: '12px',
    }),
};

export default function NotificationSentPage() {

    const location = useLocation();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    const [activeTab, setActiveTab] = useState("ALL");
    const [status, setStatus] = useState(STATUS_OPTIONS[0]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [selected, setSelected] = useState(null);

    const urlParams = new URLSearchParams(location.search);
    const openId = urlParams.get("open");

    async function load() {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                type: activeTab !== "ALL" ? activeTab : undefined,
                unread: status.value === "UNREAD" ? true : status.value === "READ" ? false : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            };

            const res = await fetchSentNotificationsPaged(params);

            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("Gagal memuat notifikasi terkirim");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, activeTab, status, startDate, endDate]);

    useEffect(() => {
        if (!openId || rows.length === 0) return;

        const notif = rows.find((n) => n.id == openId);
        if (notif) setSelected(notif);
    }, [openId, rows]);

    const formatDate = (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (value) => {
        if (!value) return "";
        return new Date(value).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getTypeLabel = (type) => {
        const map = {
            CERT_REMINDER: "Due Reminder",
            BATCH_NOTIFICATION: "Batch Reminder",
            EXPIRED_NOTICE: "Expired Reminder",
        };
        return map[type] || "-";
    };

    const getTypeBadgeClass = (type) => {
        const map = {
            CERT_REMINDER: "badge-warning text-warning-content",
            BATCH_NOTIFICATION: "badge-info text-info-content",
            EXPIRED_NOTICE: "badge-error text-error-content",
        };
        return map[type] || "badge-neutral";
    };

    const getTypeIconColor = (type) => {
        const map = {
            CERT_REMINDER: "text-warning",
            BATCH_NOTIFICATION: "text-info",
            EXPIRED_NOTICE: "text-error",
        };
        return map[type] || "text-neutral";
    };

    const clearFilter = () => {
        setStatus(STATUS_OPTIONS[0]);
        setStartDate("");
        setEndDate("");
        setPage(1);
        toast.success("Filter dibersihkan");
    };

    const handleClickNotification = (n) => {
        setSelected(n);
    };

    const getRecipientText = (n) => {
        const name = n.employeeName || "-";
        const nip = n.employeeNip ? `(${n.employeeNip})` : "";
        return `${name} ${nip}`.trim();
    };

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div>
                <h1 className="text-lg sm:text-xl font-bold">Notifikasi Terkirim</h1>
                <p className="text-xs text-gray-500">{totalElements} notifikasi</p>
            </div>

            {/* Tabs - Pill Style */}
            <div className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        className={`btn btn-sm rounded-full transition-all ${
                            activeTab === t.id
                                ? "btn-primary shadow-md"
                                : "btn-ghost border border-gray-200 hover:border-primary/50"
                        }`}
                        onClick={() => {
                            setActiveTab(t.id);
                            setPage(1);
                        }}
                    >
                        {t.id === "ALL" && <Send size={14} />}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Filters Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Status (Penerima)
                        </label>
                        <Select 
                            options={STATUS_OPTIONS} 
                            value={status} 
                            onChange={setStatus} 
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Calendar size={12} /> Dari Tanggal
                        </label>
                        <input
                            type="date"
                            className="input input-sm input-bordered w-full rounded-lg"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Calendar size={12} /> Sampai Tanggal
                        </label>
                        <input
                            type="date"
                            className="input input-sm input-bordered w-full rounded-lg"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <button 
                            className="btn btn-sm btn-accent btn-soft w-full flex gap-2 rounded-lg" 
                            onClick={clearFilter}
                        >
                            <Eraser size={14} /> Clear Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Notification List Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <span className="loading loading-dots loading-lg text-primary" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Send size={48} className="mb-3 opacity-30" />
                        <p className="text-sm">Tidak ada notifikasi terkirim</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {rows.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => handleClickNotification(n)}
                                className={`w-full text-left p-4 sm:p-5 transition-all hover:bg-base-200/50 flex gap-3 sm:gap-4 group ${
                                    !n.read ? "bg-primary/5" : ""
                                }`}
                            >
                                {/* Icon/Indicator */}
                                <div className="flex-shrink-0 relative pt-1">
                                    {!n.read ? (
                                        <Mail size={22} className={getTypeIconColor(n.type)} />
                                    ) : (
                                        <MailOpen size={22} className="text-gray-400" />
                                    )}
                                    {!n.read && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className={`text-sm sm:text-base line-clamp-1 ${
                                            !n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                                        }`}>
                                            {n.title}
                                        </h3>
                                        {!n.read && (
                                            <span className="badge badge-primary badge-xs flex-shrink-0">Belum Dibaca</span>
                                        )}
                                    </div>

                                    {/* Recipient */}
                                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                        <User size={12} className="text-gray-400" />
                                        <span>Kepada: {getRecipientText(n)}</span>
                                        {n.employeeEmail && (
                                            <span className="text-gray-400">· {n.employeeEmail}</span>
                                        )}
                                    </div>

                                    <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mt-1">
                                        {n.message}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className={`badge badge-sm ${getTypeBadgeClass(n.type)}`}>
                                            {getTypeLabel(n.type)}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatDate(n.createdAt)} {formatTime(n.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Pagination inside card */}
                {rows.length > 0 && (
                    <div className="border-t border-gray-100 p-3">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalElements={totalElements}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setPage}
                            onRowsPerPageChange={(v) => {
                                setRowsPerPage(v);
                                setPage(1);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Modal */}
            {selected && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-xl">
                        {/* Modal Header */}
                        <div className="flex items-start gap-3 mb-4">
                            <Send size={28} className={getTypeIconColor(selected.type)} />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg leading-tight">{selected.title}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className={`badge badge-sm ${getTypeBadgeClass(selected.type)}`}>
                                        {getTypeLabel(selected.type)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatDate(selected.createdAt)} · {formatTime(selected.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Recipient Info */}
                        <div className="bg-base-200/50 rounded-lg p-3 mb-3 flex items-center gap-2">
                            <User size={16} className="text-gray-500" />
                            <div className="text-sm">
                                <span className="text-gray-600">Kepada: </span>
                                <span className="font-medium">{getRecipientText(selected)}</span>
                                {selected.employeeEmail && (
                                    <span className="text-gray-500"> · {selected.employeeEmail}</span>
                                )}
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="bg-base-200/50 rounded-xl p-4 mt-2">
                            <div className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">
                                {selected.message}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="modal-action">
                            <button className="btn btn-primary btn-sm rounded-lg" onClick={() => setSelected(null)}>
                                Tutup
                            </button>
                        </div>
                    </div>

                    <form method="dialog" className="modal-backdrop bg-black/40">
                        <button onClick={() => setSelected(null)}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
