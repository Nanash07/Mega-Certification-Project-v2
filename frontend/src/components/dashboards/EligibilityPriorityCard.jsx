// src/components/dashboards/EligibilityPriorityCard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PaginationSimple from "../common/PaginationSimple";
import { fetchEmployeeEligibilityPaged } from "../../services/employeeEligibilityService";
import { formatShortIdDate } from "../../utils/date";

const toDate = (d) => (d ? new Date(d) : null);
const fmtID = (d) => formatShortIdDate(d);
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

function getPriorityPath(row) {
    const nip = row?.nip || "";
    const rule = getRuleCode(row);
    if (row?.eligibilityId) {
        return `/employee/eligibility?nip=${encodeURIComponent(nip)}&rule=${encodeURIComponent(rule)}`;
    }
    return `/employee/certification?nip=${encodeURIComponent(nip)}&rule=${encodeURIComponent(rule)}`;
}

/**
 * Reusable card untuk list eligibility by status (NOT_YET_CERTIFIED / DUE / EXPIRED)
 * props:
 * - title: judul card
 * - status: string status eligibility (NOT_YET_CERTIFIED | DUE | EXPIRED)
 * - accentClass: className tambahan di title (misal "text-sky-600")
 * - filters: object filter { divisionId, regionalId, unitId, certificationId, levelId, subFieldId, employeeId? }
 * - initialRowsPerPage: default 10
 */
export default function EligibilityPriorityCard({
    title,
    status,
    accentClass = "",
    filters = {},
    initialRowsPerPage = 10,
}) {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    async function load(p = 1, rowsOverride) {
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
    }

    useEffect(() => {
        setPage(1);
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        status,
        filters.divisionId,
        filters.regionalId,
        filters.unitId,
        filters.certificationId,
        filters.levelId,
        filters.subFieldId,
        filters.employeeId,
    ]);

    const isNotYet = status === "NOT_YET_CERTIFIED";
    const isDue = status === "DUE";
    const isExpired = status === "EXPIRED";

    return (
        <div className="card bg-base-100 border rounded-2xl shadow-sm">
            <div className="card-body p-4 md:p-5">
                <div className="flex items-center justify-between">
                    <h2 className={`card-title text-base md:text-lg ${accentClass}`}>{title}</h2>
                </div>
                <div className="mt-2 overflow-x-auto">
                    <table className="table table-xs md:table-sm">
                        <thead>
                            <tr>
                                <th>NIP</th>
                                <th>Nama</th>
                                <th>Rule</th>
                                {isDue || isExpired ? <th>Jatuh Tempo</th> : null}
                                {isDue ? <th>Sisa</th> : null}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={isDue ? 5 : isExpired ? 4 : 3}>
                                            <div className="skeleton h-5 w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={isDue ? 5 : isExpired ? 4 : 3} className="text-sm opacity-60">
                                        Tidak ada data
                                    </td>
                                </tr>
                            ) : (
                                rows.map((x, idx) => {
                                    const deadline = getDeadline(x);
                                    const sisa = deadline ? daysBetween(deadline, new Date()) : null;
                                    return (
                                        <tr
                                            key={idx}
                                            className="hover cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                navigate(getPriorityPath(x));
                                            }}
                                        >
                                            <td className="whitespace-nowrap">{x.nip}</td>
                                            <td className="whitespace-nowrap">{x.employeeName ?? x.name}</td>
                                            <td className="whitespace-nowrap">{getRuleCode(x)}</td>
                                            {isDue || isExpired ? (
                                                <td className="whitespace-nowrap">{fmtID(deadline)}</td>
                                            ) : null}
                                            {isDue ? (
                                                <td className="whitespace-nowrap text-amber-600">
                                                    {sisa != null ? `Tinggal ${sisa} hari` : "-"}
                                                </td>
                                            ) : null}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalElements > 0 && (
                    <div className="mt-3">
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
        </div>
    );
}
