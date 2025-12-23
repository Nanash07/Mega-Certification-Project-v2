// src/pages/dashboard/SuperadminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import Select from "react-select";

import { fetchBatches, fetchMonthlyBatches } from "../../services/batchService";
import { fetchEligibilityCount } from "../../services/employeeEligibilityService";

import { formatShortIdDateTime } from "../../utils/date";

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

import BatchListCard from "../../components/dashboards/BatchListCard";
import EligibilityPriorityCard from "../../components/dashboards/EligibilityPriorityCard";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const makeEmptyMonthly = () =>
    MONTHS.map((label, i) => ({
        month: i + 1,
        label,
        count: 0,
    }));

/* ===== helpers ===== */

function buildQueryFromFilters(f) {
    const params = new URLSearchParams();
    if (f.regionalId) params.set("regionalId", f.regionalId);
    if (f.divisionId) params.set("divisionId", f.divisionId);
    if (f.unitId) params.set("unitId", f.unitId);
    if (f.certificationId) params.set("certificationId", f.certificationId);
    if (f.levelId) params.set("levelId", f.levelId);
    if (f.subFieldId) params.set("subFieldId", f.subFieldId);
    if (f.batchType) params.set("batchType", f.batchType);
    if (f.startDate) params.set("startDate", f.startDate);
    if (f.endDate) params.set("endDate", f.endDate);
    return params.toString();
}

function toOptions(data, labelPicker) {
    const arr = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    return arr.filter(Boolean).map((x) => ({ value: x.id, label: labelPicker(x), raw: x }));
}

/* ===== Mini card ===== */
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

export default function SuperadminDashboard() {
    const navigate = useNavigate();

    // untuk react-select menuPortal
    const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

    // ===== filter organisasi
    const [divisionSel, setDivisionSel] = useState(null);
    const [regionalSel, setRegionalSel] = useState(null);
    const [unitSel, setUnitSel] = useState(null);
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [regionalOptions, setRegionalOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);

    // ===== filter sertifikasi
    const [certSel, setCertSel] = useState(null);
    const [levelSel, setLevelSel] = useState(null);
    const [subSel, setSubSel] = useState(null);
    const [certOptions, setCertOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subFieldOptions, setSubFieldOptions] = useState([]);

    // ===== filter tanggal & jenis batch
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

    // ===== summary/kpi
    const [summary, setSummary] = useState(null);
    const [kpi, setKpi] = useState(null);
    const [computedAt, setComputedAt] = useState(null);

    // ===== bulanan
    const [monthly, setMonthly] = useState(makeEmptyMonthly());

    /* ===== masters ===== */
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/divisions", {
                    params: { page: 0, size: 1000, sort: "name,asc" },
                });
                setDivisionOptions(toOptions(data, (d) => d?.name || d?.code || `Divisi #${d?.id}`));
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
    }, []);

    /* ===== helpers ===== */
    const currentFilters = () => {
        const typeVal = batchType?.value || undefined;
        return {
            divisionId: divisionSel?.value,
            regionalId: regionalSel?.value,
            unitId: unitSel?.value,
            certificationId: certSel?.value,
            levelId: levelSel?.value,
            subFieldId: subSel?.value,
            batchType: typeVal,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        };
    };

    async function loadSummaryAndKpi() {
        const f = currentFilters();

        const baseEligFilters = {
            regionalId: f.regionalId,
            divisionId: f.divisionId,
            unitId: f.unitId,
            certificationId: f.certificationId,
            levelId: f.levelId,
            subFieldId: f.subFieldId,
        };

        try {
            const [active, due, expired, notYet, ongoingPage] = await Promise.all([
                fetchEligibilityCount({ ...baseEligFilters, status: "ACTIVE" }),
                fetchEligibilityCount({ ...baseEligFilters, status: "DUE" }),
                fetchEligibilityCount({ ...baseEligFilters, status: "EXPIRED" }),
                fetchEligibilityCount({ ...baseEligFilters, status: "NOT_YET_CERTIFIED" }),
                fetchBatches({
                    ...baseEligFilters,
                    status: "ONGOING",
                    page: 0,
                    size: 1,
                    sortField: "startDate",
                    sortDirection: "desc",
                }),
            ]);

            const activeNum = Number(active ?? 0);
            const dueNum = Number(due ?? 0);
            const expiredNum = Number(expired ?? 0);
            const notYetNum = Number(notYet ?? 0);

            const eligibleTotal = activeNum + dueNum + expiredNum + notYetNum;
            const certifiedIncDue = activeNum + dueNum;
            const ongoingCount = Number(ongoingPage?.totalElements ?? 0);

            const mappedSummary = {
                employees: { active: eligibleTotal },
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
            console.error("loadSummaryAndKpi error", e);
            setSummary(null);
            setKpi(null);
            setComputedAt(null);
        }
    }

    async function loadMonthly() {
        const f = currentFilters();
        const typeVal = batchType?.value || undefined;

        try {
            const data = await fetchMonthlyBatches({
                regionalId: f.regionalId,
                divisionId: f.divisionId,
                unitId: f.unitId,
                certificationId: f.certificationId,
                levelId: f.levelId,
                subFieldId: f.subFieldId,
                startDate: f.startDate,
                endDate: f.endDate,
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

            setMonthly(
                MONTHS.map((label, i) => ({
                    month: i + 1,
                    label,
                    count: byIdx[i],
                }))
            );
        } catch (e) {
            console.error("loadMonthly error", e);
            setMonthly(makeEmptyMonthly());
        }
    }

    useEffect(() => {
        (async () => {
            await loadSummaryAndKpi();
            await loadMonthly();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [divisionSel, regionalSel, unitSel, certSel, levelSel, subSel, startDate, endDate, batchType]);

    /* ===== computed ===== */

    const eligibleTotal = useMemo(() => {
        if (summary?.eligibility?.total != null) return Number(summary.eligibility.total);
        const s = kpi || {};
        return (s.active ?? 0) + (s.due ?? 0) + (s.expired ?? 0) + (s.notYetCertified ?? 0);
    }, [summary, kpi]);

    const real = useMemo(() => {
        const k = kpi || {};

        const activeOnly = Number(k.active ?? 0);
        const due = Number(k.due ?? 0);
        const expired = Number(k.expired ?? 0);
        const notYet = Number(k.notYetCertified ?? 0);

        const certifiedIncDue = activeOnly + due;
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
    }, [kpi]);

    const cardConfigs = useMemo(() => {
        const filters = currentFilters();
        const q = buildQueryFromFilters(filters);
        const qs = q ? `?${q}` : "";

        return [
            {
                key: "employees",
                label: "Total Kewajiban Sertifikasi",
                value: summary?.employees?.active,
                tip: "Total kewajiban sertifikasi",
                href: `/employee/data${qs}`,
            },
            {
                key: "tersretifikasi",
                label: "Tersertifikasi",
                value: Number(summary?.certifications?.active ?? 0),
                sub:
                    eligibleTotal > 0
                        ? `${((Number(summary?.certifications?.active ?? 0) / eligibleTotal) * 100).toFixed(1)}%`
                        : undefined,
                tip: "Kewajiban sertifikasi yang sudah dipenuhi",
                href: `/employee/eligibility${qs}`,
            },
            {
                key: "due",
                label: "Jatuh Tempo",
                value: summary?.certifications?.due,
                tip: "Sertifikasi yang akan jatuh tempo",
                href: `/employee/certification${qs ? `${qs}&status=DUE` : "?status=DUE"}`,
            },
            {
                key: "expired",
                label: "Kadaluarsa",
                value: summary?.certifications?.expired,
                tip: "Sertifikasi yang sudah kadaluarsa",
                href: `/employee/certification${qs ? `${qs}&status=EXPIRED` : "?status=EXPIRED"}`,
            },
            {
                key: "notyet",
                label: "Belum Bersertifikat",
                value: kpi?.notYetCertified ?? 0,
                tip: "Kewajiban sertifikasi yang belum dipenuhi",
                href: `/employee/certification${qs ? `${qs}&status=NOT_YET_CERTIFIED` : "?status=NOT_YET_CERTIFIED"}`,
            },
            {
                key: "batches",
                label: "Batch Berjalan",
                value: summary?.batches?.ongoing ?? summary?.batchesOngoing ?? summary?.batchesCount ?? 0,
                tip: "Batch yang sedang berjalan",
                href: `/batch${qs ? `${qs}&status=ONGOING` : "?status=ONGOING"}`,
            },
        ];
    }, [
        summary,
        kpi,
        divisionSel,
        regionalSel,
        unitSel,
        certSel,
        levelSel,
        subSel,
        startDate,
        endDate,
        batchType,
        eligibleTotal,
    ]);

    /* ===== UI ===== */
    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Judul */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Superadmin Dashboard</h1>
                <p className="text-sm opacity-70 pt-1">{computedAt ? ` ${formatShortIdDateTime(computedAt)}` : ""}</p>
            </div>

            {/* Filter organisasi/sertifikasi */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <div className="tooltip tooltip-top" data-tip="Regional" title="Regional">
                    <Select
                        className="w-full"
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                        options={regionalOptions}
                        value={regionalSel}
                        onChange={setRegionalSel}
                        placeholder="Regional"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Divisi" title="Divisi">
                    <Select
                        className="w-full"
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                        options={divisionOptions}
                        value={divisionSel}
                        onChange={setDivisionSel}
                        placeholder="Divisi"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Unit" title="Unit">
                    <Select
                        className="w-full"
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                        options={unitOptions}
                        value={unitSel}
                        onChange={setUnitSel}
                        placeholder="Unit"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Sertifikat" title="Sertifikat">
                    <Select
                        className="w-full"
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                        options={certOptions}
                        value={certSel}
                        onChange={setCertSel}
                        placeholder="Filter Sertifikasi"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Jenjang" title="Jenjang">
                    <Select
                        className="w-full"
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                        options={levelOptions}
                        value={levelSel}
                        onChange={setLevelSel}
                        placeholder="Jenjang"
                        isClearable
                        isSearchable
                    />
                </div>
                <div className="tooltip tooltip-top" data-tip="Sub Bidang" title="Sub Bidang">
                    <Select
                        className="w-full"
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                        options={subFieldOptions}
                        value={subSel}
                        onChange={setSubSel}
                        placeholder="Sub Bidang"
                        isClearable
                        isSearchable
                    />
                </div>
            </div>

            {/* Filter tanggal */}
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

            {/* Summary cards */}
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
                {/* Capaian Sertifikasi Wajib */}
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <h2 className="card-title text-base md:text-lg">Capaian Sertifikasi Wajib</h2>
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
                            <h2 className="card-title text-base md:text-lg">Pelaksanaan Batch</h2>
                            <div className="min-w-[160px]">
                                <Select
                                    menuPortalTarget={menuPortalTarget}
                                    menuPosition="fixed"
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
                            {!monthly || monthly.length === 0 ? (
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

            {/* Batch Berjalan & Selesai & Belum Bersertifikat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <BatchListCard title="Batch Berjalan" status="ONGOING" filters={currentFilters()} initialRows={5} />
                <BatchListCard title="Batch Selesai" status="FINISHED" filters={currentFilters()} initialRows={5} />
                <EligibilityPriorityCard
                    title="Belum Bersertifikat"
                    status="NOT_YET_CERTIFIED"
                    accentClass="text-sky-600"
                    filters={currentFilters()}
                    initialRowsPerPage={10}
                />
            </div>

            {/* Due | Kadaluarsa */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EligibilityPriorityCard
                    title="Jatuh Tempo"
                    status="DUE"
                    accentClass="text-amber-600"
                    filters={currentFilters()}
                    initialRowsPerPage={10}
                />
                <EligibilityPriorityCard
                    title="Kadaluarsa"
                    status="EXPIRED"
                    accentClass="text-red-600"
                    filters={currentFilters()}
                    initialRowsPerPage={10}
                />
            </div>
        </div>
    );
}
