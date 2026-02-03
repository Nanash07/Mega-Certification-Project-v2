// src/components/dashboards/EligibilityPriorityCard.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PaginationSimple from "../common/PaginationSimple";
import { fetchEmployeeEligibilityPaged } from "../../services/employeeEligibilityService";
import { formatShortIdDate } from "../../utils/date";
import { Clock, AlertTriangle, XCircle, FileWarning, ArrowRight, User } from "lucide-react";

const toDate = (d) => (d ? new Date(d) : null);
const fmtID = (d) => (d ? formatShortIdDate(d) : "-");
const daysBetween = (a, b) => Math.ceil((a - b) / (1000 * 60 * 60 * 24));

function getDeadline(row) {
    return toDate(row?.dueDate) || toDate(row?.validUntil) || toDate(row?.reminderDate) || null;
}

function getRuleCode(row) {
    const pre = row?.ruleCode ?? row?.rule_code;
    if (pre && String(pre).trim() !== "") return pre;

    const code = row?.certificationCode ?? row?.certification?.code ?? row?.certification_code ?? row?.code ?? "";

    const level =
        row?.certificationLevelLevel ??
        row?.certificationLevel?.level ??
        row?.certification_level_level ??
        row?.level ??
        null;

    const sub = row?.subFieldCode ?? row?.subfieldCode ?? row?.sub_field_code ?? row?.subField?.code ?? "";

    const parts = [code || null, level != null ? String(level) : null, sub || null].filter(Boolean);
    if (parts.length) return parts.join("-");
    if (row?.rule && String(row.rule).trim() !== "") return row.rule;
    return "-";
}

function getPriorityPath() {
    return "/employee/eligibility";
}

export default function EligibilityPriorityCard({
    title,
    status,
    accentClass = "",
    filters = {},
    initialRowsPerPage = 10,
}) {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    const load = useCallback(
        async (p = 1, rowsOverride) => {
            setLoading(true);
            try {
                const size = rowsOverride ?? rowsPerPage;
                const res = await fetchEmployeeEligibilityPaged({
                    ...filters,
                    statuses: [status],
                    page: p - 1,
                    size,
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

    const isNotYet = status === "NOT_YET_CERTIFIED";
    const isDue = status === "DUE";
    const isExpired = status === "EXPIRED";

    // Define accent colors and icons based on status for consistency with BatchListCard style
    const getStatusConfig = () => {
        if (isNotYet) return { 
            color: "text-sky-600",
            bg: "bg-sky-50/50",
            badge: "text-sky-600 bg-sky-100",
            Icon: Clock 
        };
        if (isDue) return { 
            color: "text-amber-600", 
            bg: "bg-amber-50/50",
            badge: "text-amber-600 bg-amber-100",
            Icon: AlertTriangle 
        };
        if (isExpired) return { 
            color: "text-red-600", 
            bg: "bg-red-50/50",
            badge: "text-red-600 bg-red-100",
            Icon: XCircle 
        };
        return { 
            color: "text-gray-600",
            bg: "bg-gray-50/50",
            badge: "text-gray-600 bg-gray-100",
            Icon: FileWarning 
        };
    };

    const { color, bg, badge, Icon } = getStatusConfig();

    const handleHeaderClick = () => {
        const p = new URLSearchParams();
        if (status) p.set("status", status);
        if (filters.divisionId) p.set("divisionId", filters.divisionId);
        if (filters.regionalId) p.set("regionalId", filters.regionalId);
        if (filters.unitId) p.set("unitId", filters.unitId);
        if (filters.certificationId) p.set("certificationId", filters.certificationId);
        if (filters.levelId) p.set("levelId", filters.levelId);
        if (filters.subFieldId) p.set("subFieldId", filters.subFieldId);

        navigate(`/employee/eligibility?${p.toString()}`);
    };

    return (
        <div className="card bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden h-full flex flex-col min-h-[480px]">
            <div className={`p-4 border-b border-gray-100 flex items-center justify-between ${bg}`}>
                <h2
                    className="font-semibold text-sm flex items-center gap-2 text-gray-800 cursor-pointer hover:underline decoration-dashed underline-offset-4"
                    onClick={handleHeaderClick}
                    title="Lihat selengkapnya"
                >
                    <Icon size={16} className={color} />
                    {title}
                </h2>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge}`}>
                    {totalElements}
                </span>
            </div>

            <div className="flex-1">
                <div className="p-2">
                    {loading && rows.length === 0 ? (
                        <div className="space-y-1">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="skeleton h-8 w-full rounded" />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Icon size={40} strokeWidth={1.5} className="mb-3 opacity-50" />
                            <p className="text-sm">Tidak ada data</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {rows.map((x, idx) => {
                                const deadline = getDeadline(x);
                                const sisa = deadline ? daysBetween(deadline, new Date()) : null;
                                const ruleCode = getRuleCode(x);

                                return (
                                    <div
                                        key={idx}
                                        className="group bg-white border border-gray-200 rounded py-1.5 px-2.5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer min-h-[42px] flex items-center"
                                        onClick={() => navigate(getPriorityPath())}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                    <h3 className="font-semibold text-sm text-gray-800 truncate leading-tight">
                                                        {x.employeeName ?? x.name}
                                                    </h3>
                                                    {ruleCode !== "-" && (
                                                        <span className="badge badge-xs badge-outline badge-neutral text-[10px] h-5 px-1.5 opacity-70">
                                                            {ruleCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                    <span className="flex items-center gap-1 font-mono bg-gray-50 px-1.5 rounded">
                                                        {x.nip}
                                                    </span>
                                                </div>

                                                {(isDue || isExpired) && (
                                                    <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                                                        <span className="flex items-center gap-1 text-gray-500">
                                                            {isExpired ? "Kadaluarsa:" : "Jatuh Tempo:"} {fmtID(deadline)}
                                                        </span>
                                                        
                                                        {isDue && sisa != null && (
                                                            <span className={`px-1.5 py-px rounded-full text-[9px] font-medium leading-none border ${
                                                                sisa <= 7 ? "bg-red-50 border-red-100 text-red-600" : 
                                                                sisa <= 30 ? "bg-amber-50 border-amber-100 text-amber-700" :
                                                                "bg-blue-50 border-blue-100 text-blue-700"
                                                            }`}>
                                                                {sisa} hari
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <ArrowRight
                                                size={14}
                                                className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5"
                                            />
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
                            if (p !== page) {
                                load(p);
                            }
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
