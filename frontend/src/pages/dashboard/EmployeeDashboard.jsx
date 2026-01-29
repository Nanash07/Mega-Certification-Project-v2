// src/pages/dashboard/EmployeeDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import {
    LayoutDashboard,
    Layers,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Award,
    Calendar,
    Building2,
    ArrowRight,
    Users,
} from "lucide-react";

import StatCard from "../../components/dashboards/StatCard";

import {
    fetchEmployeeEligibilityPaged,
    fetchEligibilityCount,
    getCurrentEmployeeId,
} from "../../services/employeeEligibilityService";
import {
    fetchEmployeeOngoingBatchesPaged,
    fetchMonthlyBatches,
    fetchBatches,
} from "../../services/batchService";

import { formatShortIdDateTime, formatShortIdDate } from "../../utils/date";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip as ReTooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";
import PaginationSimple from "../../components/common/PaginationSimple";

/* ========= MONTHS (copas dari SuperadminDashboard) ========= */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/* ========= utils ========= */
const toNum = (v) => Number(v ?? 0) || 0;


function QuotaBar({ filled = 0, quota = 0, className }) {
    const f = Math.max(0, Number(filled) || 0);
    const q = Math.max(0, Number(quota) || 0);

    if (q === 0) {
        return <div className={`text-[10px] opacity-70 ${className || ""}`}>Terisi: {f} (tanpa kuota)</div>;
    }

    const pct = Math.min(100, Math.round((f / q) * 100));
    const label = `${f}/${q} (${pct}%)`;
    const barColor = f >= q ? "bg-success" : "bg-warning";

    return (
        <div
            className={`tooltip tooltip-top w-full ${className || ""}`}
            data-tip={label}
            title={label}
            aria-label={`Kuota ${label}`}
        >
            <div className="relative w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                {pct > 0 && (
                    <div
                        className={`absolute left-0 top-0 h-full rounded-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                    />
                )}
            </div>
             <div className="text-[10px] text-gray-400 mt-1 text-right">{label}</div>
        </div>
    );
}


function getFilledForBar(b) {
    const onrun = toNum(b.onrun ?? b.registeredOrAttended);
    const passed = toNum(b.totalPassed ?? b.passed);
    const failedExplicit = toNum(b.totalFailed ?? b.failed);
    const totalKnown = toNum(b.totalParticipants ?? b.participants);
    const failed = failedExplicit > 0 ? failedExplicit : Math.max(totalKnown - passed - onrun, 0);

    const granular = onrun + passed + failed;
    if (granular > 0) return granular;

    if (totalKnown > 0) return totalKnown;
    if (toNum(b.registeredOrAttended) > 0) return toNum(b.registeredOrAttended);
    if (onrun > 0) return onrun;
    return 0;
}

function statusLabel(status) {
    switch (status) {
        case "NOT_YET_CERTIFIED":
            return "Belum Diambil";
        case "DUE":
            return "Jatuh Tempo";
        case "EXPIRED":
            return "Kadaluarsa";
        case "ACTIVE":
            return "Aktif";
        default:
            return status || "-";
    }
}

function statusBadgeClass(status) {
    switch (status) {
        case "NOT_YET_CERTIFIED":
            return "badge badge-sm border-gray-200 bg-gray-50 text-gray-600";
        case "DUE":
            return "badge badge-sm badge-warning badge-outline";
        case "EXPIRED":
            return "badge badge-sm badge-error badge-outline";
        case "ACTIVE":
            return "badge badge-sm badge-success badge-outline";
        default:
            return "badge badge-sm badge-ghost";
    }
}

/* ========== MAIN COMPONENT ========== */

export default function EmployeeDashboard() {
    const navigate = useNavigate();

    // ===== filter jenis batch (untuk chart & batch list) =====
    const batchTypeOptions = [
        { value: "", label: "Semua Jenis" },
        { value: "CERTIFICATION", label: "Batch Sertifikasi" },
        { value: "TRAINING", label: "Training" },
        { value: "REFRESHMENT", label: "Refreshment" },
        { value: "EXTENSION", label: "Perpanjangan" },
    ];
    const [batchType, setBatchType] = useState(batchTypeOptions[0]);

    // ===== filter list kewajiban sertifikasi (eligibility) =====
    const statusFilterOptions = [
        { value: "", label: "Semua Status" },
        { value: "ACTIVE", label: "Aktif" },
        { value: "NOT_YET_CERTIFIED", label: "Belum Bersertifikat" },
        { value: "DUE", label: "Jatuh Tempo" },
        { value: "EXPIRED", label: "Kadaluarsa" },
    ];
    const [statusFilter, setStatusFilter] = useState(statusFilterOptions[0]);

    // paging list kewajiban
    const [eligPage, setEligPage] = useState(1);
    const [eligRowsPerPage, setEligRowsPerPage] = useState(10);
    const [eligData, setEligData] = useState([]);
    const [eligTotalPages, setEligTotalPages] = useState(1);
    const [eligTotalElements, setEligTotalElements] = useState(0);
    const [eligLoading, setEligLoading] = useState(false);

    // ===== summary/kpi =====
    const [summary, setSummary] = useState(null);
    const [kpi, setKpi] = useState(null);
    const [computedAt, setComputedAt] = useState(null);

    // ===== batch ONGOING (paging) =====
    const [batches, setBatches] = useState([]);
    const [batchPage, setBatchPage] = useState(1);
    const [batchRows, setBatchRows] = useState(5);
    const [batchTotalPages, setBatchTotalPages] = useState(1);
    const [batchTotalElements, setBatchTotalElements] = useState(0);
    const [loadingBatch, setLoadingBatch] = useState(false);

    // ===== batch FINISHED (paging) =====
    const [finishedBatches, setFinishedBatches] = useState([]);
    const [finishedPage, setFinishedPage] = useState(1);
    const [finishedRows, setFinishedRows] = useState(5);
    const [finishedTotalPages, setFinishedTotalPages] = useState(1);
    const [finishedTotalElements, setFinishedTotalElements] = useState(0);
    const [loadingFinished, setLoadingFinished] = useState(false);

    // ===== bulanan =====
    const [monthly, setMonthly] = useState(MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 })));

    /* ===== helpers ===== */
    const currentFilters = () => ({
        batchType: batchType?.value || undefined,
    });

    // ===== summary & KPI (pakai count eligibility + batch employee) =====
    async function loadSummaryAndKpi() {
        try {
            const employeeId = getCurrentEmployeeId();
            if (!employeeId) {
                setSummary(null);
                setKpi(null);
                setComputedAt(null);
                return;
            }

            // batchType belum kepakai di count eligibility BE, jadi nggak perlu dikirim
            const baseEligFilters = {
                employeeIds: [employeeId],
            };

            const [active, due, expired, notYet, ongoingRes] = await Promise.all([
                fetchEligibilityCount({ ...baseEligFilters, status: "ACTIVE" }),
                fetchEligibilityCount({ ...baseEligFilters, status: "DUE" }),
                fetchEligibilityCount({ ...baseEligFilters, status: "EXPIRED" }),
                fetchEligibilityCount({ ...baseEligFilters, status: "NOT_YET_CERTIFIED" }),
                fetchEmployeeOngoingBatchesPaged({
                    page: 0,
                    size: 1,
                }),
            ]);

            const activeNum = Number(active ?? 0);
            const dueNum = Number(due ?? 0);
            const expiredNum = Number(expired ?? 0);
            const notYetNum = Number(notYet ?? 0);

            const eligibleTotal = activeNum + dueNum + expiredNum + notYetNum;
            const certifiedIncDue = activeNum + dueNum;
            const ongoingCount = Number(ongoingRes?.totalElements ?? 0);

            const mappedSummary = {
                employees: { active: 1 },
                certifications: {
                    active: certifiedIncDue,
                    due: dueNum,
                    expired: expiredNum,
                },
                batches: { ongoing: ongoingCount },
                eligibility: { total: eligibleTotal },
            };

            const mappedKpi = {
                notYetCertified: notYetNum,
                active: activeNum,
                due: dueNum,
                expired: expiredNum,
            };

            setSummary(mappedSummary);
            setKpi(mappedKpi);
            setComputedAt(new Date().toISOString());
        } catch (e) {
            console.error("EmployeeDashboard loadSummaryAndKpi error", e);
            setSummary(null);
            setKpi(null);
            setComputedAt(null);
        }
    }

    async function loadBatches(page = 1) {
        setLoadingBatch(true);
        try {
            const res = await fetchEmployeeOngoingBatchesPaged({
                page: page - 1,
                size: batchRows,
            });
            const data = res || { content: [], totalPages: 0, totalElements: 0 };
            const list = Array.isArray(data.content) ? data.content : [];
            setBatches(list);
            setBatchTotalPages(data.totalPages || 1);
            setBatchTotalElements(data.totalElements || list.length || 0);
            setBatchPage(page);
        } finally {
            setLoadingBatch(false);
        }
    }

    async function loadFinishedBatches(page = 1) {
        setLoadingFinished(true);
        try {
            const res = await fetchBatches({
                status: "FINISHED",
                page: page - 1,
                size: finishedRows,
                sortField: "endDate",
                sortDirection: "desc",
            });
            const content = Array.isArray(res?.content) ? res.content : [];
            setFinishedBatches(content);
            setFinishedTotalPages(res?.totalPages || 1);
            setFinishedTotalElements(res?.totalElements || content.length || 0);
            setFinishedPage(page);
        } finally {
            setLoadingFinished(false);
        }
    }

    // ===== pakai fetchMonthlyBatches (BE sudah filter berdasarkan employee via principal) =====
    async function loadMonthly() {
        try {
            const typeVal = batchType?.value || undefined;
            const data = await fetchMonthlyBatches({
                type: typeVal,
            });

            const byIdx = Array(12).fill(0);
            if (Array.isArray(data)) {
                data.forEach((it) => {
                    const m = Number(it.month ?? it.m ?? it.monthIndex);
                    const c = Number(it.count ?? it.total ?? it.value ?? 0);
                    if (m >= 1 && m <= 12) byIdx[m - 1] = c;
                });
            }

            setMonthly(MONTHS.map((label, i) => ({ month: i + 1, label, count: byIdx[i] })));
        } catch (e) {
            console.error("EmployeeDashboard loadMonthly error", e);
            setMonthly(MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 })));
        }
    }

    async function loadEligibility(page = 1, pageSize = eligRowsPerPage) {
        setEligLoading(true);
        try {
            const employeeId = getCurrentEmployeeId();
            if (!employeeId) {
                setEligData([]);
                setEligTotalPages(0);
                setEligTotalElements(0);
                return;
            }

            const params = {
                employeeIds: [employeeId],
                statuses: statusFilter.value ? [statusFilter.value] : undefined,
                page: page - 1,
                size: pageSize,
            };

            const res = await fetchEmployeeEligibilityPaged(params);
            const content = Array.isArray(res?.content) ? res.content : [];
            setEligData(content);
            setEligTotalPages(res?.totalPages || 1);
            setEligTotalElements(res?.totalElements || content.length || 0);
            setEligPage(page);
        } finally {
            setEligLoading(false);
        }
    }

    useEffect(() => {
        (async () => {
            await loadSummaryAndKpi();
            await loadMonthly();

            setBatchPage(1);
            setBatches([]);
            await loadBatches(1);

            setFinishedPage(1);
            setFinishedBatches([]);
            await loadFinishedBatches(1);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchType]);

    // Eligibility fetch effect
    useEffect(() => {
        loadEligibility(eligPage, eligRowsPerPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eligPage, eligRowsPerPage, statusFilter]);

    // Card Configs
    const cardConfigs = useMemo(() => {
        if (!summary) return [];
        const employeeId = getCurrentEmployeeId();

        return [
            {
                key: "total",
                label: "Total Kewajiban",
                value: summary.eligibility?.total ?? 0,
                sub: "Sertifikasi Wajib",
                icon: Layers,
                color: "primary",
                tip: "Total sertifikasi yang wajib dimiliki",
                onClick: () => employeeId && navigate(`/employee/${employeeId}?tab=eligibility`),
            },
            {
                key: "active",
                label: "Sertifikat Aktif",
                value: summary.certifications?.active ?? 0,
                sub: "Valid & Berlaku",
                icon: Award,
                color: "success",
                tip: "Sertifikat yang masih berlaku (termasuk Jatuh Tempo)",
            },
            {
                key: "due",
                label: "Jatuh Tempo",
                value: summary.certifications?.due ?? 0,
                sub: "Segera Habis",
                icon: AlertTriangle,
                color: "warning",
                tip: "Sertifikat yang akan habis masa berlakunya",
            },
            {
                key: "expired",
                label: "Kadaluarsa",
                value: summary.certifications?.expired ?? 0,
                sub: "Perlu Perpanjangan",
                icon: XCircle,
                color: "error",
                tip: "Sertifikat yang sudah kadaluarsa",
            },
            {
                key: "ongoing",
                label: "Batch Berjalan",
                value: summary.batches?.ongoing ?? 0,
                sub: "Sedang Diikuti",
                icon: Clock,
                color: "info",
                tip: "Batch sertifikasi/training yang sedang diikuti",
            },
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summary]);

    // Helpers for pie data
    const pieData = kpi ? [
        { name: "Aktif", value: kpi.active },
        { name: "Jatuh Tempo", value: kpi.due },
        { name: "Kadaluarsa", value: kpi.expired },
        { name: "Belum Bersertifikat", value: kpi.notYetCertified },
    ] : [];
    
    const kpiTotal = kpi ? (kpi.active + kpi.due + kpi.expired + kpi.notYetCertified) : 0;
    const kpiPercent = kpiTotal > 0 ? Math.round(((kpi.active + kpi.due) / kpiTotal) * 100) : 0;

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 min-h-screen bg-gray-50/50 text-gray-900 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-1">
                        Selamat datang kembali! Ini ringkasan aktivitas dan sertifikasi Anda.
                    </p>
                </div>
                {computedAt && (
                    <div className="text-xs text-gray-400 font-mono bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        Updated: {formatShortIdDateTime(computedAt)}
                    </div>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {(!summary ? Array.from({length: 5}) : cardConfigs).map((cfg, i) => (
                    !summary ? (
                         <div key={i} className="card bg-base-100 border border-gray-100 shadow-sm h-full min-h-[100px] p-4 justify-center">
                            <div className="skeleton h-4 w-24 mb-2"/>
                            <div className="skeleton h-8 w-16"/>
                        </div>
                    ) : (
                        <StatCard key={cfg.key} {...cfg} />
                    )
                ))}
            </div>

            {/* Main Content */}
            <div className="flex flex-col xl:flex-row gap-6">
                {/* Left Column (Charts & Eligibility) */}
                <div className="flex-1 space-y-6 min-w-0">
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Ownership Pie */}
                        <div className="card bg-white shadow-sm border border-gray-100 rounded-xl h-full">
                            <div className="p-5 border-b border-gray-100">
                                 <h2 className="font-semibold text-lg text-gray-800">Kepemilikan Sertifikat</h2>
                            </div>
                            <div className="p-5">
                                {!kpi ? (
                                    <div className="skeleton h-64 w-full rounded-xl" />
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                        <div className="h-56 relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        innerRadius={60}
                                                        outerRadius={85}
                                                        paddingAngle={2}
                                                    >
                                                        <Cell fill="#16a34a" /> {/* Aktif */}
                                                        <Cell fill="#f97316" /> {/* Due */}
                                                        <Cell fill="#ef4444" /> {/* Expired */}
                                                        <Cell fill="#9ca3af" /> {/* Not Yet */}
                                                    </Pie>
                                                    <ReTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                                <span className="text-3xl font-bold text-gray-800">{kpiPercent}%</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Compliance</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3 text-xs w-full">
                                             {pieData.map((entry, idx) => (
                                                 <div key={idx} className="flex items-center justify-between">
                                                     <div className="flex items-center gap-2">
                                                         <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ["#16a34a", "#f97316", "#ef4444", "#9ca3af"][idx] }}></span>
                                                         <span className="text-gray-600 font-medium">{entry.name}</span>
                                                     </div>
                                                     <span className="font-bold text-gray-800">{entry.value}</span>
                                                 </div>
                                             ))}
                                             <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between">
                                                 <span className="text-gray-500">Total Wajib</span>
                                                 <span className="font-bold text-gray-800">{kpiTotal}</span>
                                             </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Batch Execution Bar */}
                        <div className="card bg-white shadow-sm border border-gray-100 rounded-xl h-full">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                                 <h2 className="font-semibold text-lg text-gray-800">Pelaksanaan Batch</h2>
                                 <div className="w-36">
                                     <Select
                                        className="text-xs"
                                        classNamePrefix="react-select"
                                        options={batchTypeOptions}
                                        value={batchType}
                                        onChange={(opt) => setBatchType(opt || batchTypeOptions[0])}
                                        isClearable={false}
                                        isSearchable={false}
                                        menuPortalTarget={document.body}
                                        styles={{ control: (base) => ({ ...base, minHeight: '32px', height: '32px' }) }}
                                     />
                                 </div>
                            </div>
                            <div className="p-5">
                                 <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                            <ReTooltip 
                                                cursor={{ fill: '#f9fafb' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                                            />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                 </div>
                            </div>
                        </div>
                    </div>

                    {/* Eligibility Table Card */}
                    <div className="card bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                         <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                             <h2 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                                  <Layers size={20} className="text-indigo-500" />
                                  Eligibility Sertifikasi
                             </h2>
                             <div className="w-full sm:w-44">
                                 <Select
                                      className="text-xs"
                                      classNamePrefix="react-select"
                                      options={statusFilterOptions}
                                      value={statusFilter}
                                      onChange={(opt) => setStatusFilter(opt || statusFilterOptions[0])}
                                      isSearchable={false}
                                      menuPortalTarget={document.body}
                                      styles={{ control: (base) => ({ ...base, minHeight: '32px', height: '32px' }) }}
                                 />
                             </div>
                         </div>
                         
                         <div className="overflow-x-auto">
                              <table className="table table-md w-full">
                                   <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                                       <tr>
                                           <th className="w-12 text-center">No</th>
                                           <th>Sertifikasi</th>
                                           <th className="text-center">Level</th>
                                           <th className="text-center">Subbidang</th>
                                           <th className="text-center">Status</th>
                                           <th className="text-center">Sisa Waktu</th>
                                       </tr>
                                   </thead>
                                   <tbody className="text-sm divide-y divide-gray-50">
                                       {eligLoading ? (
                                            Array.from({length: 3}).map((_, i) => (
                                                <tr key={i}><td colSpan={6} className="p-4"><div className="skeleton h-8 w-full"></div></td></tr>
                                            ))
                                       ) : eligData.length === 0 ? (
                                           <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada data ditemukan</td></tr>
                                       ) : (
                                            eligData.map((e, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer group border-transparent"
                                                    onClick={() => {
                                                         const eid = getCurrentEmployeeId();
                                                         if(eid) navigate(`/employee/${eid}?tab=eligibility`);
                                                    }}
                                                >
                                                     <td className="w-12 text-gray-400 text-center font-mono text-xs">{(eligPage - 1) * eligRowsPerPage + idx + 1}</td>
                                                     <td>
                                                          <div className="font-medium text-gray-800 line-clamp-1">{e.certificationName}</div>
                                                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{e.certificationCode}</div>
                                                     </td>
                                                     <td className="text-center">
                                                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 min-w-[40px]">
                                                              {e.certificationLevelLevel ?? e.certificationLevel?.level ?? "-"}
                                                          </span>
                                                     </td>
                                                     <td className="text-center">
                                                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                              {e.subFieldCode || "-"}
                                                          </span>
                                                     </td>
                                                     <td className="text-center">
                                                         <span className={statusBadgeClass(e.status)}>
                                                             {statusLabel(e.status)}
                                                         </span>
                                                     </td>
                                                     <td className="text-center text-gray-500 text-xs font-mono">{e.sisaWaktu || "-"}</td>
                                                </tr>
                                            ))
                                       )}
                                   </tbody>
                              </table>
                         </div>
                         {eligTotalElements > 0 && (
                              <div className="p-4 border-t border-gray-100">
                                   <PaginationSimple
                                      page={eligPage}
                                      totalPages={eligTotalPages}
                                      totalElements={eligTotalElements}
                                      rowsPerPage={eligRowsPerPage}
                                      onPageChange={setEligPage}
                                      onRowsPerPageChange={(n) => { setEligRowsPerPage(n); setEligPage(1); }}
                                   />
                              </div>
                         )}
                    </div>
                </div>

                {/* Right Column (Batches) */}
                <div className="w-full xl:w-80 2xl:w-96 space-y-6 flex-shrink-0">
                     {/* Ongoing Batches */}
                     <div className="card bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                           <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
                                <h2 className="font-semibold text-sm flex items-center gap-2 text-gray-800">
                                     <Clock size={16} className="text-blue-600"/>
                                     Batch Berjalan
                                </h2>
                                <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{batchTotalElements}</span>
                           </div>
                           <div className="max-h-[400px] overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                {batches.length === 0 && !loadingBatch ? (
                                     <div className="text-center py-8">
                                         <div className="text-gray-300 mb-2"><Clock size={32} className="mx-auto"/></div>
                                         <div className="text-xs text-gray-400">Tidak ada batch berjalan saat ini</div>
                                     </div>
                                ) : (
                                     batches.map((b) => (
                                          <div key={b.id} onClick={() => navigate(`/batch/${b.id}`)} 
                                               className="border border-gray-100 rounded-lg p-3 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all bg-white group relative overflow-hidden"
                                          >
                                               <div className="flex justify-between items-start mb-1.5 gap-2">
                                                   <div className="font-semibold text-xs text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                                       {b.name || b.batchName}
                                                   </div>
                                                   {/* <span className="badge badge-xs text-[9px] h-4 px-1 badge-ghost whitespace-nowrap flex-shrink-0">{b.type}</span> */}
                                               </div>
                                               <div className="text-[10px] text-gray-500 flex items-center gap-2 mb-3">
                                                    <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded text-gray-600">
                                                        <Calendar size={10}/> {formatShortIdDate(b.startDate)}
                                                    </span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-gray-400 truncate max-w-[120px]">{b.type}</span>
                                               </div>
                                               <QuotaBar filled={getFilledForBar(b)} quota={toNum(b.quota)} />
                                          </div>
                                     ))
                                )}
                           </div>
                      </div>

                      {/* Finished Batches */}
                      <div className="card bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                           <div className="p-4 border-b border-gray-100 bg-green-50/50 flex items-center justify-between">
                                <h2 className="font-semibold text-sm flex items-center gap-2 text-gray-800">
                                     <CheckCircle2 size={16} className="text-green-600"/>
                                     Batch Selesai
                                </h2>
                                <span className="text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{finishedTotalElements}</span>
                           </div>
                           <div className="max-h-[400px] overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                {finishedBatches.length === 0 ? (
                                     <div className="text-center py-8">
                                         <div className="text-gray-300 mb-2"><CheckCircle2 size={32} className="mx-auto"/></div>
                                         <div className="text-xs text-gray-400">Belum ada batch selesai</div>
                                     </div>
                                ) : (
                                     finishedBatches.map((b) => (
                                          <div key={b.id} onClick={() => navigate(`/batch/${b.id}`)} 
                                               className="border border-gray-100 rounded-lg p-3 hover:border-green-200 hover:shadow-sm cursor-pointer transition-all bg-white group"
                                          >
                                               <div className="flex justify-between items-start mb-1.5 gap-2">
                                                   <div className="font-semibold text-xs text-gray-800 line-clamp-2 leading-snug group-hover:text-green-600 transition-colors">
                                                       {b.name || b.batchName}
                                                   </div>
                                               </div>
                                               <div className="text-[10px] text-gray-500 flex items-center gap-2 mb-2">
                                                    <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded text-gray-600">
                                                        <Calendar size={10}/> {formatShortIdDate(b.endDate)}
                                                    </span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-gray-400 truncate max-w-[120px]">{b.type}</span>
                                               </div>
                                               
                                               <div className="flex items-center gap-1 text-[10px] bg-gray-50 rounded p-1.5">
                                                    <div className="flex-1 text-center border-r border-gray-200 last:border-0">
                                                        <div className="text-green-600 font-bold">{toNum(b.totalPassed ?? b.passed)}</div>
                                                        <div className="text-[9px] text-gray-400">Lulus</div>
                                                    </div>
                                                    <div className="flex-1 text-center border-r border-gray-200 last:border-0">
                                                        <div className="text-red-500 font-bold">{toNum(b.totalFailed ?? b.failed)}</div>
                                                        <div className="text-[9px] text-gray-400">Gagal</div>
                                                    </div>
                                                    <div className="flex-1 text-center">
                                                        <div className="text-gray-700 font-bold">{toNum(b.totalParticipants)}</div>
                                                        <div className="text-[9px] text-gray-400">Total</div>
                                                    </div>
                                               </div>
                                          </div>
                                     ))
                                )}
                           </div>
                      </div>
                 </div>
            </div>
        </div>
    );
}
