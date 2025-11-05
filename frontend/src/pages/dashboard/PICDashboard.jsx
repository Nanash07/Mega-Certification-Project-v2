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
import { fetchRegionals } from "../../services/regionalService";
import { fetchUnits } from "../../services/unitService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";

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

/* ===== utils ===== */
const toDate = (d) => (d ? new Date(d) : null);
const fmtID = (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");
const daysBetween = (a, b) => Math.ceil((a - b) / (1000 * 60 * 60 * 24));

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

function getDeadline(row) {
    return toDate(row?.dueDate) || toDate(row?.validUntil) || toDate(row?.reminderDate) || null;
}

/* ===== small components (sama gaya superadmin) ===== */
function MiniCard({ label, value, sub, onClick, tip }) {
    return (
        <div className="w-full">
            <button
                title={tip || label}
                onClick={onClick}
                className="rounded-2xl border border-base-200 bg-base-100 p-3 w-full text-left transition hover:shadow cursor-pointer min-h-[88px]"
            >
                <div className="text-[11px] opacity-70">{label}</div>
                <div className="text-xl font-bold">{value ?? 0}</div>
                {sub ? <div className="text-[11px] opacity-60">{sub}</div> : null}
            </button>
        </div>
    );
}

function QuotaBar({ filled = 0, quota = 0 }) {
    const f = Number(filled) || 0;
    const q = Number(quota) || 0;
    const pct = q > 0 ? Math.min(100, Math.round((f * 100) / q)) : 0;
    const isFull = q > 0 && f >= q;

    if (q <= 0) return <div className="text-[10px] opacity-70">Terisi: {f} (tanpa kuota)</div>;

    return (
        <div title={`${f}/${q} (${pct}%)`}>
            <div className="relative w-full h-3 rounded-full bg-base-200 overflow-hidden">
                <div className={`h-full ${isFull ? "bg-success" : "bg-warning"}`} style={{ width: `${pct}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                    {f}/{q} ({pct}%)
                </div>
            </div>
        </div>
    );
}

/* ===== API helper: scope PIC ===== */
async function fetchPicScope(userId) {
    const { data } = await api.get(`/pic-scope/${userId}`);
    return data; // { userId, certifications: [{ certificationId, certificationCode }, ...] }
}

function toOptions(data, labelPicker) {
    const arr = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    return arr.filter(Boolean).map((x) => ({ value: x.id, label: labelPicker(x), raw: x }));
}

export default function PicDashboard() {
    const navigate = useNavigate();

    // ambil userId dari sesi kamu
    const userRaw = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    })();
    const userId = userRaw?.id ?? userRaw?.userId ?? userRaw?.uid ?? window.__USER?.id ?? null;

    // ===== 6 filters =====
    const [regionalSel, setRegionalSel] = useState(null);
    const [divisionSel, setDivisionSel] = useState(null);
    const [unitSel, setUnitSel] = useState(null);

    const [certSel, setCertSel] = useState(null); // dari scope PIC (wajib)
    const [levelSel, setLevelSel] = useState(null);
    const [subSel, setSubSel] = useState(null);

    const [regionalOptions, setRegionalOptions] = useState([]);
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);
    const [certOptions, setCertOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subFieldOptions, setSubFieldOptions] = useState([]);

    // scope ready flag → cegah request tanpa certificationId
    const [scopeReady, setScopeReady] = useState(false);

    // ===== summary/kpi/priority =====
    const [summary, setSummary] = useState(null);
    const [kpi, setKpi] = useState(null);
    const [computedAt, setComputedAt] = useState(null);

    const [dueList, setDueList] = useState([]);
    const [expiredList, setExpiredList] = useState([]);
    const [loadingAlert, setLoadingAlert] = useState(true);

    // ===== batches =====
    const [batches, setBatches] = useState([]);
    const [batchPage, setBatchPage] = useState(0);
    const [batchHasMore, setBatchHasMore] = useState(true);
    const [loadingBatch, setLoadingBatch] = useState(false);

    // ===== monthly =====
    const nowYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }).map((_, i) => ({ value: nowYear - i, label: String(nowYear - i) }));
    const [year, setYear] = useState(yearOptions[0]);
    const [monthly, setMonthly] = useState(MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 })));

    /* ===== masters + scope ===== */
    useEffect(() => {
        (async () => {
            try {
                const regRaw = await fetchRegionals({ page: 0, size: 1000, sort: "name,asc" });
                setRegionalOptions(toOptions(regRaw, (r) => r?.name || r?.code || `Regional #${r?.id}`));
            } catch {
                setRegionalOptions([]);
            }
            try {
                const { data } = await api.get("/divisions", { params: { page: 0, size: 1000, sort: "name,asc" } });
                setDivisionOptions(toOptions(data, (d) => d?.name || d?.code || `Division #${d?.id}`));
            } catch {
                setDivisionOptions([]);
            }
            try {
                const unitRaw = await fetchUnits({ page: 0, size: 1000, sort: "name,asc" });
                setUnitOptions(toOptions(unitRaw, (u) => u?.name || u?.code || `Unit #${u?.id}`));
            } catch {
                setUnitOptions([]);
            }

            // ----- scope PIC → opsi sertifikat & default -----
            try {
                if (userId) {
                    const scope = await fetchPicScope(userId);
                    const opts = (scope?.certifications || []).map((s) => ({
                        value: s.certificationId,
                        label: s.certificationCode || `CERT-${s.certificationId}`,
                        raw: s,
                    }));
                    setCertOptions(opts);
                    // default = paling depan (kalau ada)
                    if (!certSel && opts.length > 0) setCertSel(opts[0]);
                } else {
                    setCertOptions([]);
                }
            } catch {
                setCertOptions([]);
            } finally {
                // scope dianggap ready meski kosong (BE akan limit dengan scope)
                setScopeReady(true);
            }

            // level & sub-bidang
            fetchCertificationLevels()
                .then((arr) =>
                    setLevelOptions(
                        (arr ?? []).map((l) => ({
                            value: l.id ?? l.level,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    /* ===== helpers ===== */
    const params = () => {
        // hard-guard: kalau ada scope options tapi belum ada certSel, pakai opsi[0]
        const certIdFallback = certSel?.value ?? (certOptions.length > 0 ? certOptions[0].value : undefined);
        return {
            regionalId: regionalSel?.value,
            divisionId: divisionSel?.value,
            unitId: unitSel?.value,
            certificationId: certIdFallback, // kunci pembatas
            levelId: levelSel?.value,
            subFieldId: subSel?.value,
        };
    };

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

    // ⛔️ Jangan fetch sebelum scope PIC siap (agar tidak “kebuka” ke semua sertifikat)
    useEffect(() => {
        if (!scopeReady) return;
        // kalau ada opsi scope tapi belum ada certSel, tunda sampai certSel kebentuk
        if (certOptions.length > 0 && !certSel) return;

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
    }, [scopeReady, regionalSel, divisionSel, unitSel, certSel, levelSel, subSel, year]);

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

    /* ===== UI ===== */
    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Title */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">PIC Dashboard</h1>
                <p className="text-sm opacity-70">
                    Snapshot PIC{computedAt ? ` • ${new Date(computedAt).toLocaleString("id-ID")}` : ""}
                </p>
            </div>

            {/* Filters: 6 kolom persis */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <Select
                    className="w-full"
                    options={regionalOptions}
                    value={regionalSel}
                    onChange={setRegionalSel}
                    placeholder="Regional"
                    isClearable
                    isSearchable
                />
                <Select
                    className="w-full"
                    options={divisionOptions}
                    value={divisionSel}
                    onChange={setDivisionSel}
                    placeholder="Division"
                    isClearable
                    isSearchable
                />
                <Select
                    className="w-full"
                    options={unitOptions}
                    value={unitSel}
                    onChange={setUnitSel}
                    placeholder="Unit"
                    isClearable
                    isSearchable
                />
                <Select
                    className="w-full"
                    options={certOptions}
                    value={certSel}
                    onChange={setCertSel}
                    placeholder="Sertifikat (scope PIC)"
                    isClearable={false}
                    isSearchable
                />
                <Select
                    className="w-full"
                    options={levelOptions}
                    value={levelSel}
                    onChange={setLevelSel}
                    placeholder="Level"
                    isClearable
                    isSearchable
                />
                <Select
                    className="w-full"
                    options={subFieldOptions}
                    value={subSel}
                    onChange={setSubSel}
                    placeholder="Sub Bidang"
                    isClearable
                    isSearchable
                />
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
                    : [
                          { label: "Jumlah Pegawai", value: summary.employees?.active, tip: "Pegawai aktif" },
                          {
                              label: "TTF Sertifikasi (eligibility)",
                              value: Number(summary.certifications?.active ?? 0),
                              sub:
                                  eligibleTotal > 0
                                      ? `${(
                                            (Number(summary.certifications?.active ?? 0) / eligibleTotal) *
                                            100
                                        ).toFixed(1)}%`
                                      : undefined,
                              tip: "TTF (ACTIVE+DUE)",
                          },
                          { label: "Due", value: summary.certifications?.due, tip: "Akan jatuh tempo" },
                          { label: "Expired", value: summary.certifications?.expired, tip: "Kadaluarsa" },
                          { label: "Not Yet", value: kpi?.notYetCertified ?? 0, tip: "Belum sertif" },
                          {
                              label: "Batch Ongoing",
                              value: summary.batches?.ongoing ?? summary.batchesOngoing ?? summary.batchesCount ?? 0,
                              tip: "Batch berjalan",
                          },
                      ].map((c, i) => <MiniCard key={i} {...c} />)}
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
                                                data={[
                                                    { name: "Tersertifikasi", value: real.active },
                                                    { name: "Tidak bersertif", value: real.nonActive },
                                                ]}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={55}
                                                outerRadius={85}
                                                label
                                            >
                                                <Cell fill="#16a34a" />
                                                <Cell fill="#ef4444" />
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
                                <Select options={yearOptions} value={year} onChange={setYear} placeholder="Tahun" />
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
                                                    title="Lihat batch"
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

                {/* DUE & EXPIRED */}
                <div className="flex flex-col gap-4">
                    {/* DUE */}
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
                                                    <tr key={idx} className="hover cursor-pointer" title="Lihat detail">
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

                    {/* EXPIRED */}
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
                                                    <tr key={idx} className="hover cursor-pointer" title="Lihat detail">
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
