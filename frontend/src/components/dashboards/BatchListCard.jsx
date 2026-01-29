// src/components/dashboards/BatchListCard.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PaginationSimple from "../common/PaginationSimple";
import { fetchBatches } from "../../services/batchService";
import { Calendar, Users, CheckCircle2, XCircle, Building2, ArrowRight, Play, CircleCheck } from "lucide-react";

function toNum(v) {
    return Number(v ?? 0) || 0;
}

function getRuleCode(b) {
    const code = b.certificationCode ?? b.code ?? b.certification?.code ?? "";
    const level = b.certificationLevelLevel ?? b.level ?? "";
    const sub = b.subFieldCode ?? b.subfieldCode ?? "";

    const parts = [code, level, sub].filter(Boolean);
    return parts.length ? parts.join("-") : b.type || "-";
}

function QuotaBar({ filled, quota, color = "blue" }) {
    const f = toNum(filled);
    const q = toNum(quota);

    const pct = q > 0 ? Math.min(100, Math.round((f / q) * 100)) : 0;
    const label = q > 0 ? `${f}/${q} (${pct}%)` : `${f} peserta`;

    const barColors = {
        blue: pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-blue-400",
        green: pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-green-400" : "bg-green-300",
    };

    return (
        <div className="w-full">
            <div className="relative w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                {pct > 0 && (
                    <div
                        className={`absolute left-0 top-0 h-full rounded-full ${barColors[color]} transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                    />
                )}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">{label}</div>
        </div>
    );
}

export default function BatchListCard({ title, status, filters = {}, initialRows = 5 }) {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(initialRows);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    const load = useCallback(
        async (p = 1, rowsOverride) => {
            setLoading(true);
            try {
                const size = rowsOverride ?? rowsPerPage;
                const res = await fetchBatches({
                    ...filters,
                    status,
                    page: p - 1,
                    size,
                    sortField: status === "ONGOING" ? "startDate" : "endDate",
                    sortDirection: "desc",
                });

                const content = Array.isArray(res?.content) ? res.content : [];
                setRows(content);
                setTotalPages(res?.totalPages || 1);
                setTotalElements(res?.totalElements || content.length || 0);
                setPage(p);
            } finally {
                setLoading(false);
            }
        },
        [filters, status, rowsPerPage]
    );

    useEffect(() => {
        setPage(1);
        load(1);
    }, [load]);

    const isOngoing = status === "ONGOING";
    const titleColor = isOngoing ? "text-blue-600" : "text-green-600";
    const TitleIcon = isOngoing ? Play : CircleCheck;

    const handleHeaderClick = () => {
        const p = new URLSearchParams();
        if (status) p.set("status", status);
        if (filters.divisionId) p.set("divisionId", filters.divisionId);
        if (filters.regionalId) p.set("regionalId", filters.regionalId);
        if (filters.unitId) p.set("unitId", filters.unitId);
        if (filters.certificationId) p.set("certificationId", filters.certificationId);
        if (filters.levelId) p.set("levelId", filters.levelId);
        if (filters.subFieldId) p.set("subFieldId", filters.subFieldId);

        navigate(`/batch/data?${p.toString()}`);
    };

    return (
        <div className="card bg-base-100 shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center group/header">
                <h2
                    className="font-semibold text-base flex items-center gap-2 text-gray-800 cursor-pointer hover:underline decoration-dashed underline-offset-4"
                    onClick={handleHeaderClick}
                    title="Lihat selengkapnya"
                >
                    <TitleIcon size={18} className={titleColor} />
                    {title}
                </h2>
                <button
                    onClick={handleHeaderClick}
                    className="btn btn-xs btn-ghost btn-circle opacity-0 group-hover/header:opacity-100 transition-opacity"
                >
                    <ArrowRight size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="p-4 h-full overflow-y-auto max-h-[450px]">
                    {loading && rows.length === 0 ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="skeleton h-24 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Calendar size={40} strokeWidth={1.5} className="mb-3 opacity-50" />
                            <p className="text-sm">
                                {isOngoing ? "Tidak ada batch berjalan." : "Belum ada batch selesai."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rows.map((b) => {
                                const quota = toNum(b.quota);
                                const passed = toNum(b.totalPassed ?? b.passed);
                                const failed = toNum(b.totalFailed ?? b.failed);
                                const total = toNum(b.totalParticipants);
                                const filled = isOngoing ? total : passed + failed;

                                return (
                                    <div
                                        key={b.id}
                                        className="group bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                                        onClick={() => navigate(`/batch/${b.id}`)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold text-sm text-gray-800 truncate">
                                                        {b.batchName}
                                                    </h3>
                                                    {b.type && (
                                                        <span
                                                            className={`badge badge-sm badge-outline ${
                                                                b.type === "CERTIFICATION"
                                                                    ? "badge-info"
                                                                    : b.type === "TRAINING"
                                                                      ? "badge-primary"
                                                                      : b.type === "REFRESHMENT"
                                                                        ? "badge-secondary"
                                                                        : b.type === "EXTENSION"
                                                                          ? "badge-success"
                                                                          : "badge-neutral"
                                                            }`}
                                                        >
                                                            {b.type === "CERTIFICATION"
                                                                ? "Sertifikasi"
                                                                : b.type === "TRAINING"
                                                                  ? "Training"
                                                                  : b.type === "REFRESHMENT"
                                                                    ? "Refreshment"
                                                                    : b.type === "EXTENSION"
                                                                      ? "Perpanjangan"
                                                                      : b.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={11} />
                                                        {b.startDate} – {b.endDate}
                                                    </span>
                                                    {b.institutionName && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 size={11} />
                                                            {b.institutionName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight
                                                size={16}
                                                className="text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1"
                                            />
                                        </div>

                                        <div className="mt-3">
                                            <QuotaBar filled={filled} quota={quota} color={isOngoing ? "blue" : "green"} />
                                        </div>

                                        <div className="flex items-center gap-4 mt-3 text-xs">
                                            <span className="flex items-center gap-1.5 text-gray-600">
                                                <Users size={12} className="text-gray-400" />
                                                Peserta: <span className="font-semibold">{total}</span>
                                            </span>
                                            <span className="flex items-center gap-1.5 text-green-600">
                                                <CheckCircle2 size={12} />
                                                Lulus: <span className="font-semibold">{passed}</span>
                                            </span>
                                            <span className="flex items-center gap-1.5 text-red-500">
                                                <XCircle size={12} />
                                                Gagal: <span className="font-semibold">{failed}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {totalElements > 0 && (
                <div className="p-3 border-t border-gray-100">
                    <PaginationSimple
                        page={page}
                        totalPages={totalPages}
                        totalElements={totalElements}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(p) => {
                            if (p !== page) load(p);
                        }}
                        onRowsPerPageChange={(n) => {
                            setRowsPerPage(n);
                            load(1, n);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
