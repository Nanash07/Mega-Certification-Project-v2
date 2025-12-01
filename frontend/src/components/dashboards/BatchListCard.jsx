import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PaginationSimple from "../common/PaginationSimple";
import { fetchBatches } from "../../services/batchService";

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

function QuotaBar({ filled, quota }) {
    const f = toNum(filled);
    const q = toNum(quota);

    if (q === 0) {
        return <div className="text-[10px] opacity-70">Terisi: {f} (tanpa kuota)</div>;
    }

    const pct = Math.min(100, Math.round((f / q) * 100));
    const barClass = f >= q ? "bg-success" : "bg-warning";
    const label = `${f}/${q} (${pct}%)`;

    return (
        <div className="tooltip w-full" data-tip={label}>
            <div className="relative w-full h-3 rounded-full bg-base-200 overflow-hidden">
                {pct > 0 && <div className={`absolute left-0 top-0 h-full ${barClass}`} style={{ width: `${pct}%` }} />}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px]">{label}</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Komponen batch list reusable
 * props:
 * - title: string
 * - status: "ONGOING" | "FINISHED"
 * - filters: filter dashboard (regional, division, unit, certification)
 * - initialRows: default 5
 */
export default function BatchListCard({ title, status, filters = {}, initialRows = 5 }) {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(initialRows);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    async function load(p = 1, rowsOverride) {
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
            setTotalElements(res?.totalElements || content.length);
            setPage(p);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setPage(1);
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        status,
        filters.regionalId,
        filters.divisionId,
        filters.unitId,
        filters.certificationId,
        filters.levelId,
        filters.subFieldId,
    ]);

    return (
        <div className="card bg-base-100 border rounded-2xl shadow-sm">
            <div className="card-body p-4 md:p-5">
                <h2 className="card-title text-base md:text-lg">{title}</h2>

                <div className="mt-2">
                    {rows.length === 0 && loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="skeleton h-14 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="text-sm opacity-70">
                            {status === "ONGOING" ? "Tidak ada batch berjalan." : "Belum ada batch selesai."}
                        </div>
                    ) : (
                        <ul className="menu w-full">
                            {rows.map((b) => {
                                const quota = toNum(b.quota);
                                const passed = toNum(b.totalPassed ?? b.passed);
                                const total = toNum(b.totalParticipants);
                                const failed = Math.max(total - passed, 0);
                                const filled = status === "ONGOING" ? total : passed + failed;

                                const chip = getRuleCode(b);

                                return (
                                    <li key={b.id} className="!p-0">
                                        <button
                                            className="w-full text-left hover:bg-base-200 rounded-xl p-2"
                                            onClick={() => navigate(`/batch/${b.id}`)}
                                        >
                                            <div className="min-w-0">
                                                <div className="font-medium truncate text-sm">{b.batchName}</div>
                                                <div className="text-[11px] opacity-70 truncate">
                                                    {chip} • {b.startDate} – {b.endDate}
                                                    {b.institutionName ? ` • ${b.institutionName}` : ""}
                                                </div>

                                                <div className="mt-1">
                                                    <QuotaBar filled={filled} quota={quota} />
                                                </div>

                                                <div className="mt-1 text-[11px] opacity-70">
                                                    Peserta: <span className="font-medium">{total}</span> • Lulus:{" "}
                                                    <span className="font-medium">{passed}</span> • Gagal:{" "}
                                                    <span className="font-medium">{failed}</span>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {totalElements > 0 && (
                    <div className="mt-3">
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
        </div>
    );
}
