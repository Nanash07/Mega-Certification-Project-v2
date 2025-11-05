// src/pages/dashboard/SuperadminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import api from "../../services/api";

import {
    fetchDashboardAggregate,
    fetchDashboardSummary,
    fetchMonthlyCertificationTrend,
    MONTHS,
} from "../../services/dashboardService";

import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { fetchRegionals } from "../../services/regionalService";
import { fetchUnits } from "../../services/unitService";

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

/* ========= utils ========= */
const toDate = (d) => (d ? new Date(d) : null);
const fmtID = (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");
const daysBetween = (a, b) => Math.ceil((a - b) / (1000 * 60 * 60 * 24));

function getDeadline(row) {
    return toDate(row?.dueDate) || toDate(row?.validUntil) || toDate(row?.reminderDate) || null;
}

/** KODE-{level}-SUBCODE (tanpa 'L'); dukung camelCase/snake_case; fallback ke row.rule */
function getRuleCode(row) {
    const pre = row?.ruleCode ?? row?.rule_code;
    if (pre && String(pre).trim() !== "") return pre;

    const code = row?.certificationCode ?? row?.certification?.code ?? row?.certification_code ?? row?.code ?? "";

    // CERTIFICATION LEVEL (bukan rule level)
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

/** Path ke halaman yang ADA di Sidebar */
function getPriorityPath(row) {
    const nip = row?.nip || "";
    const rule = getRuleCode(row);
    if (row?.eligibilityId) {
        return `/employee/eligibility?nip=${encodeURIComponent(nip)}&rule=${encodeURIComponent(rule)}`;
    }
    return `/employee/certification?nip=${encodeURIComponent(nip)}&rule=${encodeURIComponent(rule)}`;
}

/** Build query string dari filter */
function buildQueryFromFilters(f) {
    const params = new URLSearchParams();
    if (f.regionalId) params.set("regionalId", f.regionalId);
    if (f.divisionId) params.set("divisionId", f.divisionId);
    if (f.unitId) params.set("unitId", f.unitId);
    if (f.certificationId) params.set("certificationId", f.certificationId);
    if (f.levelId) params.set("levelId", f.levelId);
    if (f.subFieldId) params.set("subFieldId", f.subFieldId);
    return params.toString();
}

/* ========= Select: menu di portal (tanpa z-index custom) ========= */
function SelectTop(props) {
    return (
        <Select
            {...props}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            menuPosition="fixed"
        />
    );
}

/* ========= small components ========= */
function MiniCard({ label, value, sub, onClick, tip }) {
    return (
        <div className="tooltip tooltip-top w-full" data-tip={tip || label} title={tip || label}>
            <button
                onClick={onClick}
                className="rounded-2xl border border-base-200 bg-base-100 p-3 w-full text-left transition hover:shadow cursor-pointer"
            >
                <div className="text-[11px] opacity-70">{label}</div>
                <div className="text-xl font-bold">{value ?? 0}</div>
                {sub ? <div className="text-[11px] opacity-60">{sub}</div> : null}
            </button>
        </div>
    );
}

function toOptions(data, labelPicker) {
    const arr = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    return arr.filter(Boolean).map((x) => ({ value: x.id, label: labelPicker(x), raw: x }));
}

/** Bar kuota */
function QuotaBar({ filled = 0, quota = 0 }) {
    const f = Number(filled) || 0;
    const q = Number(quota) || 0;
    const pct = q > 0 ? Math.min(100, Math.round((f * 100) / q)) : 0;
    const isFull = q > 0 && f >= q;

    if (q <= 0) return <div className="text-[10px] opacity-70">Terisi: {f} (tanpa kuota)</div>;

    return (
        <div className="tooltip tooltip-top w-full" data-tip={`${f}/${q} (${pct}%)`} title={`${f}/${q} (${pct}%)`}>
            <div className="relative w-full h-3 rounded-full bg-base-200 overflow-hidden">
                <div className={`h-full ${isFull ? "bg-success" : "bg-warning"}`} style={{ width: `${pct}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                    {f}/{q} ({pct}%)
                </div>
            </div>
        </div>
    );
}

export default function SuperadminDashboard() {
    const navigate = useNavigate();

    // ===== org filters
    const [divisionSel, setDivisionSel] = useState(null);
    const [regionalSel, setRegionalSel] = useState(null);
    const [unitSel, setUnitSel] = useState(null);
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [regionalOptions, setRegionalOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);

    // ===== certification filters
    const [certSel, setCertSel] = useState(null);
    const [levelSel, setLevelSel] = useState(null);
    const [subSel, setSubSel] = useState(null);
    const [certOptions, setCertOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subFieldOptions, setSubFieldOptions] = useState([]);

    // ===== summary/kpi
    const [summary, setSummary] = useState(null);
    const [kpi, setKpi] = useState(null);
    const [computedAt, setComputedAt] = useState(null);

    // ===== alerts
    const [dueList, setDueList] = useState([]);
    const [expiredList, setExpiredList] = useState([]);
    const [loadingAlert, setLoadingAlert] = useState(true);

    // ===== batches
    const [batches, setBatches] = useState([]);
    const [batchPage, setBatchPage] = useState(0);
    const [batchHasMore, setBatchHasMore] = useState(true);
    const [loadingBatch, setLoadingBatch] = useState(false);

    // ===== monthly
    const nowYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }).map((_, i) => ({ value: nowYear - i, label: String(nowYear - i) }));
    const [year, setYear] = useState(yearOptions[0]);
    const [monthly, setMonthly] = useState(MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 })));

    /* ===== masters ===== */
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/divisions", { params: { page: 0, size: 1000, sort: "name,asc" } });
                setDivisionOptions(toOptions(data, (d) => d?.name || d?.code || `Division #${d?.id}`));
            } catch {
                setDivisionOptions([]);
            }

            try {
                const regRaw = await fetchRegionals({ page: 0, size: 1000, sort: "name,asc" });
                setRegionalOptions(toOptions(regRaw, (r) => r?.name || r?.code || `Regional #${r?.id}`));
            } catch {
                setRegionalOptions([]);
            }

            try {
                const unitRaw = await fetchUnits({ page: 0, size: 1000, sort: "name,asc" });
                setUnitOptions(toOptions(unitRaw, (u) => u?.name || u?.code || `Unit #${u?.id}`));
            } catch {
                setUnitOptions([]);
            }

            fetchCertifications()
                .then((arr) =>
                    setCertOptions((arr || []).map((c) => ({ value: c.id, label: `${c.code || c.name || c.id}` })))
                )
                .catch(() => {});

            fetchCertificationLevels()
                .then((arr) =>
                    setLevelOptions(
                        (arr ?? []).map((l) => ({
                            value: l.id ?? l.level, // BE expects levelId
                            label: `${l.level ?? l.name ?? l}`,
                        }))
                    )
                )
                .catch(() => {});

            fetchSubFields()
                .then((arr) =>
                    setSubFieldOptions((arr || []).map((s) => ({ value: s.id, label: `${s.code || s.name}` })))
                )
                .catch(() => {});
        })();
    }, []);

    /* ===== helpers ===== */
    const currentFilters = () => ({
        divisionId: divisionSel?.value,
        regionalId: regionalSel?.value,
        unitId: unitSel?.value,
        certificationId: certSel?.value,
        levelId: levelSel?.value,
        subFieldId: subSel?.value,
    });

    const params = currentFilters;

    async function loadSummaryAndKpi() {
        const agg = await fetchDashboardAggregate({ ...params(), sections: "summary,kpi" });
        setSummary(agg.summary);
        setKpi(agg.kpiStatus);
        setComputedAt(agg.computedAt);
    }

    async function loadPriority() {
        setLoadingAlert(true);
        try {
            const s = await fetchDashboardSummary({ ...params(), sections: "priority" });
            setDueList(Array.isArray(s?.dueTop) ? s.dueTop : []);
            setExpiredList(Array.isArray(s?.expiredTop) ? s.expiredTop : []);
        } catch {
            setDueList([]);
            setExpiredList([]);
        } finally {
            setLoadingAlert(false);
        }
    }

    async function loadBatches(reset = false) {
        if (loadingBatch) return;
        setLoadingBatch(true);
        try {
            const page = reset ? 0 : batchPage;
            const agg = await fetchDashboardAggregate({
                ...params(),
                sections: "batches",
                batchPage: page,
                batchSize: 10,
            });
            const res = agg.ongoingBatchesPage || { content: [], totalPages: 0 };
            const next = Array.isArray(res.content) ? res.content : [];
            setBatches((prev) => (reset ? next : [...prev, ...next]));
            setBatchHasMore(page + 1 < (res.totalPages ?? 0));
            setBatchPage(page + 1);
        } finally {
            setLoadingBatch(false);
        }
    }

    async function loadMonthly() {
        const data = await fetchMonthlyCertificationTrend({
            ...params(),
            year: year?.value,
            sections: "monthly",
        });
        setMonthly(data);
    }

    useEffect(() => {
        (async () => {
            await loadSummaryAndKpi();
            await loadPriority();
            setBatchPage(0);
            setBatches([]);
            setBatchHasMore(true);
            await loadBatches(true);
            await loadMonthly();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [divisionSel, regionalSel, unitSel, certSel, levelSel, subSel, year]);

    /* ===== computed ===== */
    const eligibleTotal = useMemo(() => {
        if (summary?.eligibility?.total != null) return Number(summary.eligibility.total);
        const s = kpi || {};
        return (s.active ?? 0) + (s.due ?? 0) + (s.expired ?? 0) + (s.notYetCertified ?? 0);
    }, [summary, kpi]);

    const real = useMemo(() => {
        const s = kpi || {};
        const activeOnly = s.active ?? 0;
        const total = (s.active ?? 0) + (s.due ?? 0) + (s.expired ?? 0) + (s.notYetCertified ?? 0);
        const nonActive = Math.max(total - activeOnly, 0);
        const pct = total > 0 ? Math.round((activeOnly / total) * 1000) / 10 : 0;
        return { active: activeOnly, nonActive, total, pct };
    }, [kpi]);

    const pieData = useMemo(
        () => [
            { name: "Tersertifikasi", value: real.active },
            { name: "Tidak bersertif", value: real.nonActive },
        ],
        [real]
    );

    // Cards config (klik -> navigate)
    const cardConfigs = useMemo(() => {
        const q = buildQueryFromFilters(currentFilters());
        return [
            {
                key: "employees",
                label: "Jumlah Pegawai",
                value: summary?.employees?.active,
                tip: "Pegawai aktif",
                href: `/employee/data${q ? `?${q}` : ""}`,
            },
            {
                key: "ttf",
                label: "TTF Sertifikasi (eligibility)",
                value: Number(summary?.certifications?.active ?? 0),
                sub:
                    eligibleTotal > 0
                        ? `${((Number(summary?.certifications?.active ?? 0) / eligibleTotal) * 100).toFixed(1)}%`
                        : undefined,
                tip: "TTF (ACTIVE+DUE)",
                href: `/employee/eligibility${q ? `?${q}` : ""}`,
            },
            {
                key: "due",
                label: "Due",
                value: summary?.certifications?.due,
                tip: "Akan jatuh tempo",
                href: `/employee/certification${q ? `?${q}&status=DUE` : "?status=DUE"}`,
            },
            {
                key: "expired",
                label: "Expired",
                value: summary?.certifications?.expired,
                tip: "Sudah kadaluarsa",
                href: `/employee/certification${q ? `?${q}&status=EXPIRED` : "?status=EXPIRED"}`,
            },
            {
                key: "notyet",
                label: "Not Yet",
                value: kpi?.notYetCertified ?? 0,
                tip: "Belum sertif",
                href: `/employee/certification${q ? `?${q}&status=NOT_YET_CERTIFIED` : "?status=NOT_YET_CERTIFIED"}`,
            },
            {
                key: "batches",
                label: "Batch Ongoing",
                value: summary?.batches?.ongoing ?? summary?.batchesOngoing ?? summary?.batchesCount ?? 0,
                tip: "Batch berjalan",
                href: `/batch${q ? `?${q}&status=ONGOING` : "?status=ONGOING"}`,
            },
        ];
    }, [summary, kpi, divisionSel, regionalSel, unitSel, certSel, levelSel, subSel, eligibleTotal]);

    /* ========= render ========= */
    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Title */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Superadmin Dashboard</h1>
                <p className="text-sm opacity-70">
                    Snapshot sistem{computedAt ? ` • ${new Date(computedAt).toLocaleString("id-ID")}` : ""}
                </p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <div className="tooltip tooltip-top" data-tip="Regional" title="Regional">
                    <SelectTop
                        className="w-full"
                        options={regionalOptions}
                        value={regionalSel}
                        onChange={setRegionalSel}
                        placeholder="Regional"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Division" title="Division">
                    <SelectTop
                        className="w-full"
                        options={divisionOptions}
                        value={divisionSel}
                        onChange={setDivisionSel}
                        placeholder="Division"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Unit" title="Unit">
                    <SelectTop
                        className="w-full"
                        options={unitOptions}
                        value={unitSel}
                        onChange={setUnitSel}
                        placeholder="Unit"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Sertifikat" title="Sertifikat">
                    <SelectTop
                        className="w-full"
                        options={certOptions}
                        value={certSel}
                        onChange={setCertSel}
                        placeholder="Jenis Sertifikat"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Level" title="Level">
                    <SelectTop
                        className="w-full"
                        options={levelOptions}
                        value={levelSel}
                        onChange={setLevelSel}
                        placeholder="Level"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Sub Bidang" title="Sub Bidang">
                    <SelectTop
                        className="w-full"
                        options={subFieldOptions}
                        value={subSel}
                        onChange={setSubSel}
                        placeholder="Sub Bidang"
                        isClearable
                        isSearchable
                    />
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
                {!summary
                    ? Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="card bg-base-100 border rounded-2xl shadow-sm">
                              <div className="card-body p-4">
                                  <div className="skeleton h-3 w-24 mb-3"></div>
                                  <div className="skeleton h-6 w-20"></div>
                              </div>
                          </div>
                      ))
                    : cardConfigs.map((c) => (
                          <MiniCard
                              key={c.key}
                              label={c.label}
                              value={c.value}
                              sub={c.sub}
                              tip={c.tip}
                              onClick={() => navigate(c.href)}
                          />
                      ))}
            </div>

            {/* Realisasi & Bulanan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Realisasi */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="card-title text-base md:text-lg">Realisasi</h2>
                        </div>

                        {!kpi ? (
                            <div className="skeleton h-56 w-full rounded-xl" />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <div className="h-56 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={55}
                                                outerRadius={85}
                                                label
                                            >
                                                {pieData.map((_, i) => (
                                                    <Cell key={i} fill={i === 0 ? "#16a34a" : "#ef4444"} />
                                                ))}
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
                                        <span>Tersertifikasi</span>
                                        <span className="font-semibold ml-auto">{real.active}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-block w-3 h-3 rounded-sm"
                                            style={{ background: "#ef4444" }}
                                        />
                                        <span>Tidak bersertif</span>
                                        <span className="font-semibold ml-auto">{real.nonActive}</span>
                                    </div>
                                    <div className="pt-2 text-xs opacity-70">Total populasi: {real.total}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bulanan */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="card-title text-base md:text-lg">Total Sertifikasi / Bulan</h2>
                            <div className="min-w-[120px]">
                                <SelectTop options={yearOptions} value={year} onChange={setYear} placeholder="Tahun" />
                            </div>
                        </div>
                        <div className="h-64">
                            {!monthly ? (
                                <div className="skeleton h-full w-full rounded-xl" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthly} key={year?.value || "y0"}>
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
            </div>

            {/* Batches & Priority */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Batches */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm lg:col-span-1">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg">Batch Berjalan (ONGOING)</h2>
                        </div>

                        <div className="max-h-96 overflow-auto pr-1">
                            {batches.length === 0 && loadingBatch ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="skeleton h-14 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="text-sm opacity-70">Tidak ada batch ONGOING.</div>
                            ) : (
                                <ul className="menu w-full">
                                    {batches.map((b) => {
                                        const quota = Number(b.quota ?? 0);
                                        const onrun = Number(b.onrun ?? b.registeredOrAttended ?? b.participants ?? 0);
                                        const passed = Number(b.passed ?? 0);
                                        const failed = Number(b.failed ?? 0);
                                        const filled = onrun + passed + failed;
                                        const chip = getRuleCode(b);

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
                                                            {chip && chip !== "-" ? chip : b.type || "-"} •{" "}
                                                            {b.startDate} – {b.endDate}
                                                            {b.institutionName ? ` • ${b.institutionName}` : ""}
                                                        </div>
                                                        <div className="mt-1">
                                                            <QuotaBar filled={filled} quota={quota} />
                                                        </div>
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {batchHasMore && (
                            <div className="pt-3">
                                <button
                                    className="btn btn-sm w-full"
                                    onClick={() => loadBatches(false)}
                                    disabled={loadingBatch}
                                >
                                    {loadingBatch ? "Loading..." : "Load more"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column: Due & Expired */}
                <div className="flex flex-col gap-4">
                    {/* DUE CARD */}
                    <div className="card bg-base-100 border rounded-2xl shadow-sm">
                        <div className="card-body p-4 md:p-5">
                            <div className="flex items-center justify-between">
                                <h2 className="card-title text-base md:text-lg text-amber-600">Due (Top 10)</h2>
                            </div>

                            <div className="overflow-auto max-h-96">
                                <table className="table table-xs md:table-sm">
                                    <thead>
                                        <tr>
                                            <th>NIP</th>
                                            <th>Nama</th>
                                            <th>Rule</th>
                                            <th>Jatuh Tempo</th>
                                            <th>Sisa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingAlert ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <tr key={i}>
                                                    <td colSpan={5}>
                                                        <div className="skeleton h-5 w-full" />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : dueList.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-sm opacity-60">
                                                    Tidak ada data
                                                </td>
                                            </tr>
                                        ) : (
                                            dueList.map((x, idx) => {
                                                const deadline = getDeadline(x);
                                                const sisa = deadline ? daysBetween(deadline, new Date()) : null;
                                                return (
                                                    <tr
                                                        key={idx}
                                                        className="hover cursor-pointer"
                                                        title="Buka detail"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            navigate(getPriorityPath(x));
                                                        }}
                                                    >
                                                        <td className="whitespace-nowrap">{x.nip}</td>
                                                        <td className="whitespace-nowrap">
                                                            {x.employeeName ?? x.name}
                                                        </td>
                                                        <td className="whitespace-nowrap">{getRuleCode(x)}</td>
                                                        <td className="whitespace-nowrap">{fmtID(deadline)}</td>
                                                        <td className="whitespace-nowrap text-amber-600">
                                                            {sisa != null ? `Tinggal ${sisa} hari` : "-"}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* EXPIRED CARD */}
                    <div className="card bg-base-100 border rounded-2xl shadow-sm">
                        <div className="card-body p-4 md:p-5">
                            <div className="flex items-center justify-between">
                                <h2 className="card-title text-base md:text-lg text-red-600">Expired (Top 10)</h2>
                            </div>

                            <div className="overflow-auto max-h-96">
                                <table className="table table-xs md:table-sm">
                                    <thead>
                                        <tr>
                                            <th>NIP</th>
                                            <th>Nama</th>
                                            <th>Rule</th>
                                            <th>Jatuh Tempo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingAlert ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <tr key={i}>
                                                    <td colSpan={4}>
                                                        <div className="skeleton h-5 w-full" />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : expiredList.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-sm opacity-60">
                                                    Tidak ada data
                                                </td>
                                            </tr>
                                        ) : (
                                            expiredList.map((x, idx) => {
                                                const deadline = getDeadline(x);
                                                return (
                                                    <tr
                                                        key={idx}
                                                        className="hover cursor-pointer"
                                                        title="Buka detail"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            navigate(getPriorityPath(x));
                                                        }}
                                                    >
                                                        <td className="whitespace-nowrap">{x.nip}</td>
                                                        <td className="whitespace-nowrap">
                                                            {x.employeeName ?? x.name}
                                                        </td>
                                                        <td className="whitespace-nowrap">{getRuleCode(x)}</td>
                                                        <td className="whitespace-nowrap">{fmtID(deadline)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
