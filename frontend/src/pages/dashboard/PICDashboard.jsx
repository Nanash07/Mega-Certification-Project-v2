// src/pages/dashboard/PicDashboard.jsx
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
import { fetchMyPicScope } from "../../services/picScopeService";
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

/* ===== utils ===== */
const toDate = (d) => (d ? new Date(d) : null);
const fmtID = (d) => formatShortIdDate(d);
const daysBetween = (a, b) => Math.ceil((a - b) / (1000 * 60 * 60 * 24));
const toNum = (v) => Number(v ?? 0) || 0;

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

/* React-Select helper biar menu gak ketutup */
function SelectTop(props) {
    return (
        <Select
            {...props}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            menuPosition="fixed"
        />
    );
}

/* ===== small components (tooltip & size sama Superadmin) ===== */
function MiniCard({ label, value, sub, onClick, tip }) {
    return (
        <div className="tooltip tooltip-top w-full" data-tip={tip || label} title={tip || label}>
            <button
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

/** QuotaBar: teks gelap tunggal, tooltip DaisyUI */
function QuotaBar({ filled = 0, quota = 0, className }) {
    const f = Math.max(0, Number(filled) || 0);
    const q = Math.max(0, Number(quota) || 0);

    if (q === 0) {
        return <div className={`text-[10px] opacity-70 ${className || ""}`}>Terisi: {f} (tanpa kuota)</div>;
    }

    const pct = Math.min(100, Math.round((f / q) * 100));
    const isFull = f >= q;
    const label = `${f}/${q} (${pct}%)`;

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
                        className={`absolute left-0 top-0 h-full rounded-full ${isFull ? "bg-success" : "bg-warning"}`}
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

function toOptions(data, labelPicker) {
    const arr = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    return arr.filter(Boolean).map((x) => ({ value: x.id, label: labelPicker(x), raw: x }));
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

export default function PicDashboard() {
    const navigate = useNavigate();

    // ===== 6 filter =====
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

    // ===== filter tanggal & jenis batch (sama seperti Superadmin) =====
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const batchTypeOptions = [
        { value: "", label: "Semua Jenis" },
        { value: "CERTIFICATION", label: "Batch Sertifikasi" },
        { value: "TRAINING", label: "Training" },
        { value: "REFRESHMENT", label: "Refreshment" },
        { value: "EXTENSION", label: "Perpanjangan" },
    ];
    const [batchType, setBatchType] = useState(batchTypeOptions[0]);

    // scope ready flag → cegah request tanpa certificationId
    const [scopeReady, setScopeReady] = useState(false);

    // ===== ringkasan/kpi/prioritas =====
    const [summary, setSummary] = useState(null);
    const [kpi, setKpi] = useState(null);
    const [computedAt, setComputedAt] = useState(null);

    const [dueList, setDueList] = useState([]);
    const [expiredList, setExpiredList] = useState([]);
    const [notYetList, setNotYetList] = useState([]);
    const [loadingAlert, setLoadingAlert] = useState(true);

    // paging priority
    const [notYetPage, setNotYetPage] = useState(1);
    const [notYetRowsPerPage, setNotYetRowsPerPage] = useState(10);
    const [duePage, setDuePage] = useState(1);
    const [dueRowsPerPage, setDueRowsPerPage] = useState(10);
    const [expiredPage, setExpiredPage] = useState(1);
    const [expiredRowsPerPage, setExpiredRowsPerPage] = useState(10);

    // ===== batch ONGOING (paging) =====
    const [batches, setBatches] = useState([]);
    const [batchPage, setBatchPage] = useState(1);
    const [batchRows, setBatchRows] = useState(10);
    const [batchTotalPages, setBatchTotalPages] = useState(1);
    const [batchTotalElements, setBatchTotalElements] = useState(0);
    const [loadingBatch, setLoadingBatch] = useState(false);

    // ===== batch FINISHED (paging, sama layout Superadmin) =====
    const [finishedBatches, setFinishedBatches] = useState([]);
    const [finishedPage, setFinishedPage] = useState(1);
    const [finishedRows, setFinishedRows] = useState(10);
    const [finishedTotalPages, setFinishedTotalPages] = useState(1);
    const [finishedTotalElements, setFinishedTotalElements] = useState(0);
    const [loadingFinished, setLoadingFinished] = useState(false);

    // ===== bulanan =====
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
                setDivisionOptions(toOptions(data, (d) => d?.name || d?.code || `Divisi #${d?.id}`));
            } catch {
                setDivisionOptions([]);
            }
            try {
                const unitRaw = await fetchUnits({ page: 0, size: 1000, sort: "name,asc" });
                setUnitOptions(toOptions(unitRaw, (u) => u?.name || u?.code || `Unit #${u?.id}`));
            } catch {
                setUnitOptions([]);
            }

            // ----- scope PIC: opsi sertifikat & default -----
            try {
                const scope = await fetchMyPicScope();
                const opts = (scope?.certifications || []).map((s) => ({
                    value: s.certificationId,
                    label: s.certificationCode || `SERT-${s.certificationId}`,
                    raw: s,
                }));
                setCertOptions(opts);
                if (opts.length === 0) {
                    setCertSel(null);
                } else {
                    setCertSel((prev) => {
                        if (prev && opts.some((opt) => opt.value === prev.value)) {
                            return prev;
                        }
                        return opts[0];
                    });
                }
            } catch {
                setCertOptions([]);
                setCertSel(null);
            } finally {
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
    }, []);

    /* ===== helpers ===== */
    const params = () => {
        // pastikan selalu ada certificationId dari scope PIC
        const certIdFallback = certSel?.value ?? (certOptions.length > 0 ? certOptions[0].value : undefined);
        return {
            regionalId: regionalSel?.value,
            divisionId: divisionSel?.value,
            unitId: unitSel?.value,
            certificationId: certIdFallback,
            levelId: levelSel?.value,
            subFieldId: subSel?.value,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            batchType: batchType?.value || undefined,
        };
    };

    const currentFilters = params;

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
            setNotYetList(Array.isArray(s?.notYetTop) ? s.notYetTop : []);

            setNotYetPage(1);
            setDuePage(1);
            setExpiredPage(1);
        } finally {
            setLoadingAlert(false);
        }
    }

    async function loadBatches(page = 1) {
        setLoadingBatch(true);
        try {
            const agg = await fetchDashboardAggregate({
                ...params(),
                sections: "batches",
                batchPage: page - 1, // BE zero-based
                batchSize: batchRows,
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
                    page: page - 1, // BE zero-based
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
        const data = await fetchMonthlyCertificationTrend({
            ...params(),
            sections: "monthly",
        });
        setMonthly(data);
    }

    // ⛔️ Jangan fetch sebelum scope PIC siap (biar data tetap terbatas sesuai scope)
    useEffect(() => {
        if (!scopeReady) return;
        if (certOptions.length > 0 && !certSel) return;

        (async () => {
            await loadSummaryAndKpi();
            await loadPriority();

            // ONGOING (reset ke page 1)
            setBatchPage(1);
            setBatches([]);
            await loadBatches(1);

            // FINISHED (reset ke page 1)
            setFinishedPage(1);
            setFinishedBatches([]);
            await loadFinishedBatches(1);

            await loadMonthly();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scopeReady, regionalSel, divisionSel, unitSel, certSel, levelSel, subSel, startDate, endDate, batchType]);

    /* ===== computed ===== */
    const eligibleTotal = useMemo(() => {
        if (summary?.eligibility?.total != null) return Number(summary.eligibility.total);
        const s = kpi || {};
        return (s.active ?? 0) + (s.due ?? 0) + (s.expired ?? 0) + (s.notYetCertified ?? 0);
    }, [summary, kpi]);

    // Realisasi: DISAMAKAN dengan Superadmin (4 kategori)
    const real = useMemo(() => {
        const cert = summary?.certifications || {};
        const k = kpi || {};

        // di Summary card: "Tersertifikasi" = ACTIVE + DUE
        const activePlusDue = Number(cert.active ?? 0);
        const due = Number(cert.due ?? 0);
        const expired = Number(cert.expired ?? 0);

        // ACTIVE only = (ACTIVE + DUE) - DUE
        const activeOnly = Math.max(activePlusDue - due, 0);

        // Summary nggak punya "belum bersertifikat", ambil dari kpi
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

    // paging priority sliced
    const notYetTotalPages = Math.max(1, Math.ceil(notYetList.length / notYetRowsPerPage));
    const dueTotalPages = Math.max(1, Math.ceil(dueList.length / dueRowsPerPage));
    const expiredTotalPages = Math.max(1, Math.ceil(expiredList.length / expiredRowsPerPage));

    const notYetPaged = useMemo(() => {
        const start = (notYetPage - 1) * notYetRowsPerPage;
        return notYetList.slice(start, start + notYetRowsPerPage);
    }, [notYetList, notYetPage, notYetRowsPerPage]);

    const duePaged = useMemo(() => {
        const start = (duePage - 1) * dueRowsPerPage;
        return dueList.slice(start, start + dueRowsPerPage);
    }, [dueList, duePage, dueRowsPerPage]);

    const expiredPaged = useMemo(() => {
        const start = (expiredPage - 1) * expiredRowsPerPage;
        return expiredList.slice(start, start + expiredRowsPerPage);
    }, [expiredList, expiredPage, expiredRowsPerPage]);

    // ======= Kartu ringkas =======
    const cardConfigs = useMemo(() => {
        const q = buildQueryFromFilters(currentFilters());
        return [
            {
                key: "employees",
                label: "Jumlah Pegawai",
                value: summary?.employees?.active,
                tip: "Jumlah pegawai",
                href: `/employee/data${q ? `?${q}` : ""}`,
            },
            {
                key: "certified",
                label: "Tersertifikasi",
                value: Number(summary?.certifications?.active ?? 0),
                sub:
                    eligibleTotal > 0
                        ? `${((Number(summary?.certifications?.active ?? 0) / eligibleTotal) * 100).toFixed(1)}%`
                        : undefined,
                tip: "Tersertifikasi",
                href: `/employee/eligibility${q ? `?${q}` : ""}`,
            },
            {
                key: "due",
                label: "Jatuh Tempo",
                value: summary?.certifications?.due,
                tip: "Akan jatuh tempo",
                href: `/employee/certification${q ? `?${q}&status=DUE` : "?status=DUE"}`,
            },
            {
                key: "expired",
                label: "Kadaluarsa",
                value: summary?.certifications?.expired,
                tip: "Sudah kadaluarsa",
                href: `/employee/certification${q ? `?${q}&status=EXPIRED` : "?status=EXPIRED"}`,
            },
            {
                key: "notyet",
                label: "Belum Bersertifikat",
                value: kpi?.notYetCertified ?? 0,
                tip: "Belum bersertifikat",
                href: `/employee/certification${q ? `?${q}&status=NOT_YET_CERTIFIED` : "?status=NOT_YET_CERTIFIED"}`,
            },
            {
                key: "batches",
                label: "Batch Berjalan",
                value: summary?.batches?.ongoing ?? summary?.batchesOngoing ?? summary?.batchesCount ?? 0,
                tip: "Batch yang sedang berjalan",
                href: `/batch${q ? `?${q}&status=ONGOING` : "?status=ONGOING"}`,
            },
        ];
    }, [summary, kpi, regionalSel, divisionSel, unitSel, certSel, levelSel, subSel, eligibleTotal]);

    /* ===== UI ===== */
    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Judul */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Dashboard PIC</h1>
                <p className="text-sm opacity-70">
                    Ringkasan PIC{computedAt ? ` • ${formatShortIdDateTime(computedAt)}` : ""}
                </p>
            </div>

            {/* Filter: 6 kolom + tooltip ala Superadmin */}
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
                <div className="tooltip tooltip-top" data-tip="Divisi" title="Divisi">
                    <SelectTop
                        className="w-full"
                        options={divisionOptions}
                        value={divisionSel}
                        onChange={setDivisionSel}
                        placeholder="Divisi"
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
                        placeholder="Sertifikat"
                        isClearable={false}
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Jenjang" title="Jenjang">
                    <SelectTop
                        className="w-full"
                        options={levelOptions}
                        value={levelSel}
                        onChange={setLevelSel}
                        placeholder="Jenjang"
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

            {/* Filter tanggal (sama Superadmin) */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <div className="tooltip tooltip-top" data-tip="Tanggal Mulai Batch" title="Tanggal Mulai Batch">
                    <div className="form-control w-full">
                        <label className="label py-1">
                            <span className="label-text text-xs">Tanggal Mulai Batch</span>
                        </label>
                        <input
                            type="date"
                            className="input input-sm input-bordered w-full"
                            value={startDate || ""}
                            onChange={(e) => setStartDate(e.target.value || "")}
                        />
                    </div>
                </div>
                <div className="tooltip tooltip-top" data-tip="Tanggal Selesai Batch" title="Tanggal Selesai Batch">
                    <div className="form-control w-full">
                        <label className="label py-1">
                            <span className="label-text text-xs">Tanggal Selesai Batch</span>
                        </label>
                        <input
                            type="date"
                            className="input input-sm input-bordered w-full"
                            value={endDate || ""}
                            onChange={(e) => setEndDate(e.target.value || "")}
                        />
                    </div>
                </div>
            </div>

            {/* Summary cards (ukuran & konten sama) */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
                {!summary
                    ? Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="card bg-base-100 border rounded-2xl shadow-sm">
                              <div className="card-body p-4 min-h-[88px] justify-center">
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
                {/* Realisasi – DISAMAKAN dengan Superadmin */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <h2 className="card-title text-base md:text-lg">Realisasi</h2>
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
                                                {/* Aktif */}
                                                <Cell fill="#16a34a" />
                                                {/* Due */}
                                                <Cell fill="#f97316" />
                                                {/* Expired */}
                                                <Cell fill="#ef4444" />
                                                {/* Belum */}
                                                <Cell fill="#0ea5e9" />
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
                                            style={{ background: "#0ea5e9" }}
                                        />
                                        <span>Belum Bersertifikat</span>
                                        <span className="font-semibold ml-auto">{real.notYet}</span>
                                    </div>
                                    <div className="pt-2 text-xs opacity-70">Total populasi: {real.total}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bulanan - sama gaya Superadmin (pakai batchType) */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="card-title text-base md:text-lg">Pelaksanaan Batch</h2>
                            <div className="min-w-[160px]">
                                <SelectTop
                                    options={batchTypeOptions}
                                    value={batchType}
                                    onChange={(v) => setBatchType(v || batchTypeOptions[0])}
                                    placeholder="Jenis Batch"
                                    isClearable={false}
                                    isSearchable={false}
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
            </div>

            {/* ====== Batch Berjalan & Selesai & Belum Bersertifikat ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Kolom 1 - ONGOING */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
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
                                <div className="text-sm opacity-70">Tidak ada batch berjalan.</div>
                            ) : (
                                <ul className="menu w-full">
                                    {batches.map((b) => {
                                        const quota = toNum(b.quota);
                                        const filled = getFilledForBar(b);
                                        const chip = getRuleCode(b);

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
                                                            {chip && chip !== "-" ? chip : b.type || "-"} •{" "}
                                                            {b.startDate} – {b.endDate}
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

                {/* Kolom 2 - FINISHED */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
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

                {/* Kolom 3 - Belum Bersertifikat */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg text-sky-600">Belum Bersertifikat</h2>
                        </div>
                        <div className="overflow-auto max-h-96">
                            <table className="table table-xs md:table-sm">
                                <thead>
                                    <tr>
                                        <th>NIP</th>
                                        <th>Nama</th>
                                        <th>Rule</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingAlert ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={3}>
                                                    <div className="skeleton h-5 w-full" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : notYetList.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="text-sm opacity-60">
                                                Tidak ada data
                                            </td>
                                        </tr>
                                    ) : (
                                        notYetPaged.map((x, idx) => (
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
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {notYetList.length > 0 && (
                            <PaginationSimple
                                page={notYetPage}
                                totalPages={notYetTotalPages}
                                totalElements={notYetList.length}
                                rowsPerPage={notYetRowsPerPage}
                                onPageChange={setNotYetPage}
                                onRowsPerPageChange={(n) => {
                                    setNotYetRowsPerPage(n);
                                    setNotYetPage(1);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ====== Due | Kadaluarsa (2 kolom, sama Superadmin) ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Due */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify_between">
                            <h2 className="card-title text-base md:text-lg text-amber-600">Jatuh Tempo</h2>
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
                                        duePaged.map((x, idx) => {
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

                        {dueList.length > 0 && (
                            <PaginationSimple
                                page={duePage}
                                totalPages={dueTotalPages}
                                totalElements={dueList.length}
                                rowsPerPage={dueRowsPerPage}
                                onPageChange={setDuePage}
                                onRowsPerPageChange={(n) => {
                                    setDueRowsPerPage(n);
                                    setDuePage(1);
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Kadaluarsa */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg text-red-600">Kadaluarsa</h2>
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
                                        expiredPaged.map((x, idx) => {
                                            const deadline = getDeadline(x);
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
                                                    <td className="whitespace-nowrap">{fmtID(deadline)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {expiredList.length > 0 && (
                            <PaginationSimple
                                page={expiredPage}
                                totalPages={expiredTotalPages}
                                totalElements={expiredList.length}
                                rowsPerPage={expiredRowsPerPage}
                                onPageChange={setExpiredPage}
                                onRowsPerPageChange={(n) => {
                                    setExpiredRowsPerPage(n);
                                    setExpiredPage(1);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
