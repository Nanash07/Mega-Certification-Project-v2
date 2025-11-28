// src/pages/dashboard/EmployeeDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import api from "../../services/api";

import {
    fetchEmployeeDashboardAggregate,
    fetchEmployeeMonthlyCertificationTrend,
    MONTHS,
} from "../../services/dashboardService";
import { fetchEmployeeEligibilityPaged } from "../../services/employeeEligibilityService";

import { formatShortIdDate, formatShortIdDateTime } from "../../utils/date";

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

/* ========= utils ========= */
const toDate = (d) => (d ? new Date(d) : null);
const fmtID = (d) => formatShortIdDate(d);
const daysBetween = (a, b) => Math.ceil((a - b) / (1000 * 60 * 60 * 24));
const toNum = (v) => Number(v ?? 0) || 0;

function getDeadline(row) {
    return toDate(row?.dueDate) || toDate(row?.validUntil) || toDate(row?.reminderDate) || null;
}

/** Ambil employeeId dari localStorage (sesuai login) */
function getCurrentEmployeeId() {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("employeeId");
    if (raw == null || raw === "") return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
}

/* ========= small components ========= */
function MiniCard({ label, value, sub, tip }) {
    return (
        <div className="tooltip tooltip-top w-full" data-tip={tip || label} title={tip || label}>
            <div className="rounded-2xl border border-base-200 bg-base-100 p-3 w-full min-h-[88px]">
                <div className="text-[11px] opacity-70">{label}</div>
                <div className="text-xl font-bold">{value ?? 0}</div>
                {sub ? <div className="text-[11px] opacity-60">{sub}</div> : null}
            </div>
        </div>
    );
}

/** ======= QuotaBar ======= */
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
            <div className="relative w-full h-3 rounded-full bg-base-200 overflow-hidden">
                {pct > 0 && (
                    <div
                        className={`absolute left-0 top-0 h-full rounded-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                    />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-base-content/80">{label}</span>
                </div>
            </div>
        </div>
    );
}

/** Hitung "terisi" untuk progress bar ONGOING: onrun + passed + failed (fallback aman) */
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
            return "badge badge-sm badge-info";
        case "DUE":
            return "badge badge-sm badge-warning";
        case "EXPIRED":
            return "badge badge-sm badge-error";
        case "ACTIVE":
            return "badge badge-sm badge-success";
        default:
            return "badge badge-sm";
    }
}

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

    async function loadSummaryAndKpi() {
        const agg = await fetchEmployeeDashboardAggregate({ ...currentFilters(), sections: "summary,kpi" });
        setSummary(agg.summary);
        setKpi(agg.kpiStatus);
        setComputedAt(agg.computedAt);
    }

    async function loadBatches(page = 1) {
        setLoadingBatch(true);
        try {
            const agg = await fetchEmployeeDashboardAggregate({
                ...currentFilters(),
                sections: "batches",
                page: page - 1, // FE paging, BE: page/size
                size: batchRows,
            });
            const res = agg.ongoingBatchesPage || { content: [], totalPages: 0, totalElements: 0 };
            const list = Array.isArray(res.content) ? res.content : [];
            setBatches(list);
            setBatchTotalPages(res.totalPages || 1);
            setBatchTotalElements(res.totalElements || list.length || 0);
            setBatchPage(page);
        } finally {
            setLoadingBatch(false);
        }
    }

    async function loadFinishedBatches(page = 1) {
        setLoadingFinished(true);
        try {
            const { data } = await api.get("/batches/paged", {
                params: {
                    status: "FINISHED",
                    page: page - 1,
                    size: finishedRows,
                    sort: "endDate,desc",
                },
            });
            const content = Array.isArray(data?.content) ? data.content : [];
            setFinishedBatches(content);
            setFinishedTotalPages(data?.totalPages || 1);
            setFinishedTotalElements(data?.totalElements || content.length || 0);
            setFinishedPage(page);
        } finally {
            setLoadingFinished(false);
        }
    }

    async function loadMonthly() {
        const data = await fetchEmployeeMonthlyCertificationTrend({
            ...currentFilters(),
            sections: "monthly",
        });
        setMonthly(data);
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
                page: page - 1, // BE zero-based
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

    // initial + reload ketika batchType berubah
    useEffect(() => {
        (async () => {
            await loadSummaryAndKpi();
            await loadMonthly();

            // ONGOING (reset ke page 1)
            setBatchPage(1);
            setBatches([]);
            await loadBatches(1);

            // FINISHED (reset ke page 1)
            setFinishedPage(1);
            setFinishedBatches([]);
            await loadFinishedBatches(1);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchType]);

    // reset paging eligibility saat filter status berubah
    useEffect(() => {
        setEligPage(1);
    }, [statusFilter]);

    // load eligibility ketika page / rows / filter berubah
    useEffect(() => {
        (async () => {
            await loadEligibility(eligPage, eligRowsPerPage);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, eligPage, eligRowsPerPage]);

    /* ===== computed ===== */
    const eligibleTotal = useMemo(() => {
        if (summary?.eligibility?.total != null) return Number(summary.eligibility.total);
        const s = kpi || {};
        return (s.active ?? 0) + (s.due ?? 0) + (s.expired ?? 0) + (s.notYetCertified ?? 0);
    }, [summary, kpi]);

    const real = useMemo(() => {
        const cert = summary?.certifications || {};
        const k = kpi || {};

        const activePlusDue = Number(cert.active ?? 0);
        const due = Number(cert.due ?? 0);
        const expired = Number(cert.expired ?? 0);
        const activeOnly = Math.max(activePlusDue - due, 0);
        const notYet = Number(k.notYetCertified ?? 0);

        const certifiedIncDue = activePlusDue;
        const total = activeOnly + due + expired + notYet;
        const pct = total > 0 ? Math.round((certifiedIncDue / total) * 1000) / 10 : 0;

        return {
            activeOnly,
            due,
            expired,
            notYet,
            certifiedIncDue,
            total,
            pct,
        };
    }, [summary, kpi]);

    // Kartu ringkas
    const cardConfigs = useMemo(() => {
        return [
            {
                id: "eligible",
                label: "Kewajiban Sertifikasi",
                value: eligibleTotal,
                tip: "Total kewajiban sertifikasi Anda",
            },
            {
                id: "tersretifikasi",
                label: "Tersertifikasi",
                value: Number(summary?.certifications?.active ?? 0),
                sub:
                    eligibleTotal > 0
                        ? `${((Number(summary?.certifications?.active ?? 0) / eligibleTotal) * 100).toFixed(1)}%`
                        : undefined,
                tip: "Kewajiban yang sudah tersertifikasi",
            },
            {
                id: "due",
                label: "Jatuh Tempo",
                value: summary?.certifications?.due,
                tip: "Sertifikat akan jatuh tempo",
            },
            {
                id: "expired",
                label: "Kadaluarsa",
                value: summary?.certifications?.expired,
                tip: "Sertifikat sudah kadaluarsa",
            },
            {
                id: "notyet",
                label: "Belum Bersertifikat",
                value: kpi?.notYetCertified ?? 0,
                tip: "Kewajiban yang belum tersertifikasi",
            },
            {
                id: "batches",
                label: "Batch Berjalan",
                value: summary?.batches?.ongoing ?? summary?.batchesOngoing ?? summary?.batchesCount ?? 0,
                tip: "Batch yang sedang Anda ikuti",
            },
        ];
    }, [summary, kpi, eligibleTotal]);

    /* ========= render ========= */
    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Judul */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Dashboard Pegawai</h1>
                <p className="text-sm opacity-70">
                    Status sertifikasi Anda{computedAt ? ` • ${formatShortIdDateTime(computedAt)}` : ""}
                </p>
            </div>

            {/* Kartu ringkas (row pertama) */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
                {!summary
                    ? Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="card bg-base-100 border rounded-2xl shadow-sm">
                              <div className="card-body p-4 min-h-[88px] justify-center">
                                  <div className="skeleton h-3 w-24 mb-3" />
                                  <div className="skeleton h-6 w-20" />
                              </div>
                          </div>
                      ))
                    : cardConfigs.map(({ id, ...rest }) => <MiniCard key={id} {...rest} />)}
            </div>

            {/* Row kedua: Kepemilikan Sertifikat + Pelaksanaan Batch + Batch Berjalan */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                {/* Kepemilikan Sertifikat (pie) */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm xl:col-span-2">
                    <div className="card-body p-4 md:p-5">
                        <h2 className="card-title text-base md:text-lg">Kepemilikan Sertifikat</h2>
                        {!kpi ? (
                            <div className="skeleton h-56 w-full rounded-xl" />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <div className="h-56 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: "Aktif", value: real.activeOnly },
                                                    { name: "Jatuh Tempo", value: real.due },
                                                    { name: "Kadaluarsa", value: real.expired },
                                                    { name: "Belum Bersertifikat", value: real.notYet },
                                                ]}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={55}
                                                outerRadius={85}
                                                label
                                            >
                                                <Cell fill="#16a34a" />
                                                <Cell fill="#f97316" />
                                                <Cell fill="#ef4444" />
                                                <Cell fill="#717171" />
                                            </Pie>
                                            <ReTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">
                                        {real.pct}%
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-block w-3 h-3 rounded-sm"
                                            style={{ background: "#16a34a" }}
                                        />
                                        <span>Aktif</span>
                                        <span className="font-semibold ml-auto">{real.activeOnly}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-block w-3 h-3 rounded-sm"
                                            style={{ background: "#f97316" }}
                                        />
                                        <span>Jatuh Tempo</span>
                                        <span className="font-semibold ml-auto">{real.due}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-block w-3 h-3 rounded-sm"
                                            style={{ background: "#ef4444" }}
                                        />
                                        <span>Kadaluarsa</span>
                                        <span className="font-semibold ml-auto">{real.expired}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-block w-3 h-3 rounded-sm"
                                            style={{ background: "#717171" }}
                                        />
                                        <span>Belum Bersertifikat</span>
                                        <span className="font-semibold ml-auto">{real.notYet}</span>
                                    </div>
                                    <div className="pt-2 text-xs opacity-70">Total kewajiban: {real.total}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pelaksanaan Batch (bar chart) */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm xl:col-span-2">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="card-title text-base md:text-lg">Pelaksanaan Batch</h2>
                            <div className="min-w-[180px]">
                                <label className="label py-1">
                                    <span className="label-text text-xs">Jenis Batch</span>
                                </label>
                                <Select
                                    className="w-full text-xs"
                                    classNamePrefix="react-select"
                                    options={batchTypeOptions}
                                    value={batchType}
                                    onChange={(opt) => setBatchType(opt || batchTypeOptions[0])}
                                    isClearable={false}
                                    isSearchable={false}
                                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                    menuPosition="fixed"
                                />
                            </div>
                        </div>
                        <div className="h-64">
                            {!monthly ? (
                                <div className="skeleton h-full w-full rounded-xl" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthly}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="label" />
                                        <YAxis allowDecimals={false} />
                                        <ReTooltip />
                                        <Bar dataKey="count" fill="#16a34a" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Batch Berjalan (kolom kanan) */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm xl:col-span-1">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg">Batch Berjalan</h2>
                        </div>

                        <div className="max-h-96 overflow-auto pr-1">
                            {batches.length === 0 && loadingBatch ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="skeleton h-14 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="text-sm opacity-70">Anda belum mengikuti batch berjalan.</div>
                            ) : (
                                <ul className="menu w-full">
                                    {batches.map((b) => {
                                        const quota = toNum(b.quota);
                                        const filled = getFilledForBar(b);
                                        const passed = toNum(b.totalPassed ?? b.passed);
                                        const total = toNum(
                                            b.totalParticipants ?? b.participants ?? b.registeredOrAttended ?? b.onrun
                                        );
                                        const failedExplicit = toNum(b.totalFailed ?? b.failed);
                                        const onrun = toNum(b.onrun ?? b.registeredOrAttended);
                                        const failed =
                                            failedExplicit > 0 ? failedExplicit : Math.max(total - passed - onrun, 0);

                                        return (
                                            <li key={b.id} className="!p-0">
                                                <button
                                                    className="w-full text-left hover:bg-base-200 rounded-xl p-2"
                                                    onClick={() => navigate(`/batch/${b.id}`)}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-medium truncate text-sm">
                                                            {b.name || b.batchName}
                                                        </div>
                                                        <div className="text-[11px] opacity-70 truncate">
                                                            {b.type || "-"} • {b.startDate} – {b.endDate}
                                                            {b.institutionName ? ` • ${b.institutionName}` : ""}
                                                        </div>
                                                        <div className="mt-1">
                                                            <QuotaBar filled={filled} quota={quota} />
                                                        </div>
                                                        <div className="mt-1 text-[11px] opacity-70">
                                                            Lulus: <span className="font-medium">{passed}</span> •
                                                            Gagal: <span className="font-medium">{failed}</span> •
                                                            Peserta: <span className="font-medium">{total}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {batchTotalElements > 0 && (
                            <PaginationSimple
                                page={batchPage}
                                totalPages={batchTotalPages}
                                totalElements={batchTotalElements}
                                rowsPerPage={batchRows}
                                onPageChange={(p) => {
                                    if (p !== batchPage) {
                                        loadBatches(p);
                                    }
                                }}
                                onRowsPerPageChange={(n) => {
                                    setBatchRows(n);
                                    loadBatches(1);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Row ketiga: Eligibility (kiri lebar) + Batch Selesai (kanan) */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                {/* Eligibility list */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm xl:col-span-4">
                    <div className="card-body p-4 md:p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h2 className="card-title text-base md:text-lg">Eligibility Sertifikasi</h2>

                            <div className="min-w-[160px]">
                                <Select
                                    className="text-xs"
                                    classNamePrefix="react-select"
                                    options={statusFilterOptions}
                                    value={statusFilter}
                                    onChange={(opt) => setStatusFilter(opt || statusFilterOptions[0])}
                                    isSearchable={false}
                                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                    menuPosition="fixed"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table table-zebra text-xs">
                                <thead className="bg-base-200">
                                    <tr>
                                        <th>No</th>
                                        <th>Kode Sertifikasi</th>
                                        <th>Nama Sertifikasi</th>
                                        <th>Level</th>
                                        <th>Sub Bidang</th>
                                        <th>Status</th>
                                        <th>Sisa Waktu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eligLoading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={7}>
                                                    <div className="skeleton h-5 w-full" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : eligData.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-sm opacity-60">
                                                Belum ada data eligibility.
                                            </td>
                                        </tr>
                                    ) : (
                                        eligData.map((e, idx) => {
                                            const employeeId = getCurrentEmployeeId();
                                            return (
                                                <tr
                                                    key={e.id || idx}
                                                    className="hover cursor-pointer"
                                                    title="Klik untuk lihat detail di halaman pegawai (tab Eligibility)"
                                                    onClick={(ev) => {
                                                        ev.preventDefault();
                                                        ev.stopPropagation();
                                                        if (employeeId) {
                                                            navigate(`/employee/${employeeId}?tab=eligibility`);
                                                        }
                                                    }}
                                                >
                                                    <td>{(eligPage - 1) * eligRowsPerPage + idx + 1}</td>
                                                    <td className="whitespace-nowrap">{e.certificationCode || "-"}</td>
                                                    <td className="whitespace-nowrap">{e.certificationName || "-"}</td>
                                                    <td className="whitespace-nowrap">
                                                        {e.certificationLevelLevel ??
                                                            e.certificationLevel?.level ??
                                                            "-"}
                                                    </td>
                                                    <td className="whitespace-nowrap">{e.subFieldCode || "-"}</td>
                                                    <td className="whitespace-nowrap">
                                                        <span className={statusBadgeClass(e.status)}>
                                                            {statusLabel(e.status)}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap">{e.sisaWaktu || "-"}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {eligTotalElements > 0 && (
                            <PaginationSimple
                                page={eligPage}
                                totalPages={eligTotalPages}
                                totalElements={eligTotalElements}
                                rowsPerPage={eligRowsPerPage}
                                onPageChange={setEligPage}
                                onRowsPerPageChange={(n) => {
                                    setEligRowsPerPage(n);
                                    setEligPage(1);
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Batch Selesai */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm xl:col-span-1">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg">Batch Selesai</h2>
                        </div>

                        <div className="max-h-96 overflow-auto pr-1">
                            {finishedBatches.length === 0 && loadingFinished ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="skeleton h-14 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : finishedBatches.length === 0 ? (
                                <div className="text-sm opacity-70">Belum ada batch selesai.</div>
                            ) : (
                                <ul className="menu w-full">
                                    {finishedBatches.map((b) => {
                                        const quota = toNum(b.quota);
                                        const passed = toNum(b.totalPassed ?? b.passed);
                                        const total = toNum(b.totalParticipants);
                                        const failed = Math.max(total - passed, 0);
                                        const filled = passed + failed;

                                        return (
                                            <li key={b.id} className="!p-0">
                                                <button
                                                    className="w-full text-left hover:bg-base-200 rounded-xl p-2"
                                                    onClick={() => navigate(`/batch/${b.id}`)}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-medium truncate text-sm">
                                                            {b.name || b.batchName}
                                                        </div>
                                                        <div className="text-[11px] opacity-70 truncate">
                                                            {b.type || "-"} • {b.startDate} – {b.endDate}
                                                            {b.institutionName ? ` • ${b.institutionName}` : ""}
                                                        </div>
                                                        <div className="mt-1">
                                                            <QuotaBar filled={filled} quota={quota} />
                                                        </div>
                                                        <div className="mt-1 text-[11px] opacity-70">
                                                            Lulus: <span className="font-medium">{passed}</span> •
                                                            Gagal: <span className="font-medium">{failed}</span> •
                                                            Peserta: <span className="font-medium">{total}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {finishedTotalElements > 0 && (
                            <PaginationSimple
                                page={finishedPage}
                                totalPages={finishedTotalPages}
                                totalElements={finishedTotalElements}
                                rowsPerPage={finishedRows}
                                onPageChange={(p) => {
                                    if (p !== finishedPage) {
                                        loadFinishedBatches(p);
                                    }
                                }}
                                onRowsPerPageChange={(n) => {
                                    setFinishedRows(n);
                                    loadFinishedBatches(1);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
