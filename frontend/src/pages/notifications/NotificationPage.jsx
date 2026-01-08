import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import { ArrowLeft, Eraser, Bell, Calendar, Filter } from "lucide-react";

import { fetchNotificationsPaged, markNotificationAsRead } from "../../services/notificationService";
import Pagination from "../../components/common/Pagination";

const TABS = [
    { id: "ALL", label: "Semua" },
    { id: "CERT_REMINDER", label: "Due Reminder" },
    { id: "BATCH_NOTIFICATION", label: "Batch Reminder" },
    { id: "EXPIRED_NOTICE", label: "Expired Reminder" },
];

const STATUS_OPTIONS = [
    { value: "", label: "Semua Status" },
    { value: "UNREAD", label: "Belum Dibaca" },
    { value: "READ", label: "Sudah Dibaca" },
];

export default function NotificationPage() {
    const navigate = useNavigate();
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

            const res = await fetchNotificationsPaged(params);

            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("Gagal memuat notifikasi");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
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
            CERT_REMINDER: "badge-warning",
            BATCH_NOTIFICATION: "badge-info",
            EXPIRED_NOTICE: "badge-error",
        };
        return map[type] || "badge-neutral";
    };

    const clearFilter = () => {
        setStatus(STATUS_OPTIONS[0]);
        setStartDate("");
        setEndDate("");
        setPage(1);
        toast.success("Filter dibersihkan");
    };

    const handleClickNotification = async (n) => {
        setSelected(n);

        if (n.read) return;

        try {
            await markNotificationAsRead(n.id);
            setRows((prev) =>
                prev.map((item) =>
                    item.id === n.id ? { ...item, read: true, readAt: new Date().toISOString() } : item
                )
            );
        } catch {
            toast.error("Gagal update status");
        }
    };

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Notifikasi</h1>
                    <p className="text-xs text-gray-500">{totalElements} notifikasi</p>
                </div>
                <button className="btn btn-sm btn-accent rounded-lg flex items-center gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft size={14} /> Kembali
                </button>
            </div>

            {/* Tabs */}
            <div className="tabs tabs-lift w-full mb-0">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        className={`tab ${activeTab === t.id ? "tab-active" : ""}`}
                        onClick={() => {
                            setActiveTab(t.id);
                            setPage(1);
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4 border-t-0 rounded-t-none">
                {/* Filter Section */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Status
                        </label>
                        <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} className="text-xs" classNamePrefix="react-select" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Calendar size={12} /> Dari Tanggal
                        </label>
                        <input
                            type="date"
                            className="input input-sm input-bordered w-full text-xs"
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
                            className="input input-sm input-bordered w-full text-xs"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <button className="btn btn-sm btn-accent btn-soft w-full flex gap-2 rounded-lg" onClick={clearFilter}>
                            <Eraser size={14} /> Clear Filter
                        </button>
                    </div>
                </div>

                {/* Notification List */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <span className="loading loading-dots loading-lg text-primary" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-gray-400">
                        <Bell size={48} className="mb-3 opacity-30" />
                        <p className="text-sm">Tidak ada notifikasi</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rows.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => handleClickNotification(n)}
                                className={`w-full text-left rounded-xl border p-4 text-sm 
                                    hover:bg-base-200 transition flex flex-col gap-2
                                    ${!n.read ? "bg-primary/10 border-primary" : "bg-base-100"}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{n.title}</span>
                                    {!n.read && <span className="badge badge-primary badge-xs">Baru</span>}
                                </div>

                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`badge badge-xs ${getTypeBadgeClass(n.type)}`}>
                                        {getTypeLabel(n.type)}
                                    </span>
                                    <div className="text-xs text-gray-500">{formatDate(n.createdAt)}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {rows.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-4">
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

            {selected && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-xl">
                        <h3 className="font-bold text-lg mb-1">{selected.title}</h3>

                        <p className="text-xs text-gray-500 mb-2">
                            {getTypeLabel(selected.type)} · {formatDate(selected.createdAt)}
                        </p>

                        <div className="mt-2 whitespace-pre-line text-sm">{selected.message}</div>

                        <div className="modal-action">
                            <button className="btn btn-sm" onClick={() => setSelected(null)}>
                                Tutup
                            </button>
                        </div>
                    </div>

                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setSelected(null)}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
