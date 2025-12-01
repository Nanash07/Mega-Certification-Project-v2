// src/services/dashboardService.js
import api from "./api";
import { fetchEligibilityKpi } from "./employeeEligibilityService";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Buang param null/undefined/"" supaya query clean */
const cleanParams = (obj = {}) =>
    Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined && v !== ""));

/** Normalisasi data bulanan dari berbagai bentuk respons */
function normalizeMonthly(raw) {
    const byIdx = Array(12).fill(0);
    if (!raw) return MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 }));

    const arr = Array.isArray(raw) ? raw : raw?.months && Array.isArray(raw.months) ? raw.months : null;
    if (arr) {
        arr.forEach((it) => {
            const m = Number(it.month ?? it.m ?? it.monthIndex);
            const c = Number(it.count ?? it.total ?? it.value ?? 0);
            if (m >= 1 && m <= 12) byIdx[m - 1] = c;
        });
    } else if (typeof raw === "object") {
        Object.entries(raw).forEach(([k, v]) => {
            const m = Number(k);
            if (m >= 1 && m <= 12) byIdx[m - 1] = Number(v ?? 0);
        });
    }

    return byIdx.map((count, i) => ({ month: i + 1, label: MONTHS[i], count }));
}

/** Helper bikin objek aggregate dari SummaryDTO backend */
function mapSummaryToAggregate(summary) {
    const employeeCount = Number(summary?.employeeCount ?? 0);
    const certifiedIncDue = Number(summary?.certifiedCount ?? 0);
    const dueCount = Number(summary?.dueCount ?? 0);
    const expiredCount = Number(summary?.expiredCount ?? 0);
    const notYetCount = Number(summary?.notYetCount ?? 0);
    const eligibleTotal = Number(summary?.eligiblePopulation ?? 0);
    const ongoingBatchCnt = Number(summary?.ongoingBatchCount ?? 0);

    // certifiedIncDue = ACTIVE + DUE (dari backend)
    const activeOnly = Math.max(0, certifiedIncDue - dueCount);

    return {
        summary: {
            employees: { active: employeeCount },
            certifications: {
                active: certifiedIncDue,
                due: dueCount,
                expired: expiredCount,
            },
            batches: { ongoing: ongoingBatchCnt },
            eligibility: { total: eligibleTotal },
        },
        kpiStatus: {
            notYetCertified: notYetCount,
            active: activeOnly,
            due: dueCount,
            expired: expiredCount,
        },
        composition: [
            { key: "CERTIFIED", label: "Tersertifikasi", value: certifiedIncDue },
            { key: "NOT_YET", label: "Belum", value: notYetCount },
        ],
    };
}

/**
 * Ambil 3 list prioritas (Belum, DUE, EXPIRED) dari /employee-eligibility/paged
 * dengan filter dashboard (regional/division/unit/cert/level/subField).
 * Backend sudah aware PIC scope.
 */
async function fetchPriorityLists(filters = {}) {
    const base = cleanParams(filters);
    const size = 10; // top 10

    try {
        const [notYetRes, dueRes, expiredRes] = await Promise.all([
            api.get("/employee-eligibility/paged", {
                params: {
                    ...base,
                    statuses: ["NOT_YET_CERTIFIED"],
                    page: 0,
                    size,
                    sort: "employee.name,asc",
                },
            }),
            api.get("/employee-eligibility/paged", {
                params: {
                    ...base,
                    statuses: ["DUE"],
                    page: 0,
                    size,
                    sort: "dueDate,asc",
                },
            }),
            api.get("/employee-eligibility/paged", {
                params: {
                    ...base,
                    statuses: ["EXPIRED"],
                    page: 0,
                    size,
                    sort: "dueDate,desc",
                },
            }),
        ]);

        const pickContent = (res) => (Array.isArray(res?.data?.content) ? res.data.content : []);

        return {
            notYet: pickContent(notYetRes),
            due: pickContent(dueRes),
            expired: pickContent(expiredRes),
        };
    } catch (e) {
        console.error("API error: fetchPriorityLists", e);
        return { notYet: [], due: [], expired: [] };
    }
}

/** =================== SUPERADMIN / PIC =================== */

/**
 * Aggregate: summary + monthly + priority.
 * Summary tetap dari /dashboard/summary (yang sekarang sudah pakai eligibility di backend),
 * sedangkan KPI (pie chart) di-override dari /employee-eligibility/dashboard-kpi.
 */
export async function fetchDashboardAggregate(params = {}) {
    const filters = cleanParams(params);

    try {
        const [summaryRes, monthlyRes, priorityLists, kpiRes] = await Promise.all([
            api.get(`/dashboard/summary`, { params: filters }),
            api.get(`/dashboard/monthly`, { params: filters }),
            fetchPriorityLists(filters),
            fetchEligibilityKpi(filters),
        ]);

        const { summary, composition } = mapSummaryToAggregate(summaryRes?.data);
        const monthlyTrend = normalizeMonthly(monthlyRes?.data);
        const { notYet, due, expired } = priorityLists;

        const kpiStatus = {
            active: Number(kpiRes?.active ?? 0),
            due: Number(kpiRes?.due ?? 0),
            expired: Number(kpiRes?.expired ?? 0),
            notYetCertified: Number(kpiRes?.notYetCertified ?? 0),
        };

        // Sinkronkan total eligibility kalau summary belum isi
        if (!summary?.eligibility?.total && kpiRes?.eligibleTotal != null) {
            summary.eligibility.total = Number(kpiRes.eligibleTotal ?? 0);
        }

        return {
            computedAt: new Date().toISOString(),
            summary,
            kpiStatus,
            composition,
            dueTop: due,
            expiredTop: expired,
            notYetTop: notYet,
            monthlyTrend,
        };
    } catch (e) {
        console.error("API error (aggregate)", e);
        return {
            computedAt: null,
            summary: {
                employees: { active: 0 },
                certifications: { active: 0, due: 0, expired: 0 },
                batches: { ongoing: 0 },
                eligibility: { total: 0 },
            },
            kpiStatus: { notYetCertified: 0, active: 0, due: 0, expired: 0 },
            composition: [],
            dueTop: [],

            expiredTop: [],
            notYetTop: [],
            monthlyTrend: MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 })),
        };
    }
}

/* ==== Wrapper yang lebih spesifik ==== */
export async function fetchDashboardSummary(params = {}) {
    const filters = cleanParams(params);
    try {
        const [summaryRes, priorityLists, kpiRes] = await Promise.all([
            api.get(`/dashboard/summary`, { params: filters }),
            fetchPriorityLists(filters),
            fetchEligibilityKpi(filters),
        ]);

        const { summary, composition } = mapSummaryToAggregate(summaryRes?.data);
        const { notYet, due, expired } = priorityLists;

        const kpiStatus = {
            active: Number(kpiRes?.active ?? 0),
            due: Number(kpiRes?.due ?? 0),
            expired: Number(kpiRes?.expired ?? 0),
            notYetCertified: Number(kpiRes?.notYetCertified ?? 0),
        };

        if (!summary?.eligibility?.total && kpiRes?.eligibleTotal != null) {
            summary.eligibility.total = Number(kpiRes.eligibleTotal ?? 0);
        }

        return {
            computedAt: new Date().toISOString(),
            summary,
            kpiStatus,
            composition,
            dueTop: due,
            expiredTop: expired,
            notYetTop: notYet,
        };
    } catch (e) {
        console.error("API error: GET /dashboard/summary or priority", e);
        return {
            computedAt: null,
            summary: {
                employees: { active: 0 },
                certifications: { active: 0, due: 0, expired: 0 },
                batches: { ongoing: 0 },
                eligibility: { total: 0 },
            },
            kpiStatus: { notYetCertified: 0, active: 0, due: 0, expired: 0 },
            composition: [],
            dueTop: [],
            expiredTop: [],
            notYetTop: [],
        };
    }
}

export async function fetchKpiStatus(params = {}) {
    try {
        const kpiRes = await fetchEligibilityKpi(params);
        return {
            active: Number(kpiRes?.active ?? 0),
            due: Number(kpiRes?.due ?? 0),
            expired: Number(kpiRes?.expired ?? 0),
            notYetCertified: Number(kpiRes?.notYetCertified ?? 0),
        };
    } catch (e) {
        console.error("API error: KPI", e);
        return { notYetCertified: 0, active: 0, due: 0, expired: 0 };
    }
}

/**
 * Ongoing batches untuk dashboard (superadmin/PIC) sekarang pakai /batches/paged
 * dengan status=ONGOING. Dipisah dari aggregate.
 */
export async function fetchOngoingBatchesPaged(params = {}) {
    const { page, size, ...filters } = params;
    const pg = Number.isInteger(page) ? Number(page) : 0;
    const sz = Number.isInteger(size) ? Number(size) : 10;

    try {
        const { data } = await api.get(`/batches/paged`, {
            params: cleanParams({
                ...filters,
                status: "ONGOING",
                page: pg,
                size: sz,
            }),
        });

        const content = Array.isArray(data?.content) ? data.content : [];
        return {
            content,
            totalPages: data?.totalPages ?? 0,
            totalElements: data?.totalElements ?? content.length,
        };
    } catch (e) {
        console.error("API error: ongoing batches paged", e);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchMonthlyCertificationTrend(params = {}) {
    try {
        const { data } = await api.get(`/dashboard/monthly`, { params: cleanParams(params) });
        return normalizeMonthly(data);
    } catch (e) {
        console.error("API error: monthly", e);
        return MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 }));
    }
}

/** Ambil opsi filter untuk dropdown FE */
export async function fetchDashboardFilters() {
    try {
        const { data } = await api.get(`/dashboard/filters`);
        return (
            data ?? {
                regionals: [],
                divisions: [],
                units: [],
                certifications: [],
                levels: [],
                subFields: [],
            }
        );
    } catch (e) {
        console.error("API error: filters", e);
        return { regionals: [], divisions: [], units: [], certifications: [], levels: [], subFields: [] };
    }
}

/** =================== PEGAWAI (SELF DASHBOARD) =================== */

export async function fetchEmployeeDashboardAggregate(params = {}) {
    const { page, size, ...filters } = params;
    const q = cleanParams(filters);
    const pg = Number.isInteger(page) ? Number(page) : 0;
    const sz = Number.isInteger(size) ? Number(size) : 10;

    try {
        const [summaryRes, monthlyRes, priorityRes, ongoingRes] = await Promise.all([
            api.get(`/dashboard/employee/summary`, { params: q }),
            api.get(`/dashboard/employee/monthly`, { params: q }),
            api.get(`/dashboard/employee/priority`, { params: q }),
            api.get(`/batches/employee/ongoing-paged`, {
                params: { page: pg, size: sz },
            }),
        ]);

        const { summary, kpiStatus, composition } = mapSummaryToAggregate(summaryRes?.data);
        const monthlyTrend = normalizeMonthly(monthlyRes?.data);

        const ongoingPage = ongoingRes?.data || {
            content: [],
            totalPages: 0,
            totalElements: 0,
        };
        const content = Array.isArray(ongoingPage.content) ? ongoingPage.content : [];

        const priorityData = priorityRes?.data ?? {};
        const dueTop = priorityData.dueTop10 ?? priorityData.due ?? [];
        const expiredTop = priorityData.expiredTop10 ?? priorityData.expired ?? [];
        const notYetTop = priorityData.notYetTop ?? priorityData.notYet ?? [];

        return {
            computedAt: new Date().toISOString(),
            summary,
            kpiStatus,
            composition,
            ongoingBatchesPage: {
                content,
                totalPages: ongoingPage.totalPages ?? 0,
                totalElements: ongoingPage.totalElements ?? content.length,
            },
            dueTop,
            expiredTop,
            notYetTop,
            monthlyTrend,
        };
    } catch (e) {
        console.error("API error (employee aggregate)", e);
        return {
            computedAt: null,
            summary: {
                employees: { active: 0 },
                certifications: { active: 0, due: 0, expired: 0 },
                batches: { ongoing: 0 },
                eligibility: { total: 0 },
            },
            kpiStatus: { notYetCertified: 0, active: 0, due: 0, expired: 0 },
            composition: [],
            ongoingBatchesPage: { content: [], totalPages: 0, totalElements: 0 },
            dueTop: [],
            expiredTop: [],
            notYetTop: [],
            monthlyTrend: MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 })),
        };
    }
}

/** Summary + priority khusus pegawai */
export async function fetchEmployeeDashboardSummary(params = {}) {
    const filters = cleanParams(params);
    try {
        const [summaryRes, priorityRes] = await Promise.all([
            api.get(`/dashboard/employee/summary`, { params: filters }),
            api.get(`/dashboard/employee/priority`, { params: filters }),
        ]);

        const { summary, kpiStatus, composition } = mapSummaryToAggregate(summaryRes?.data);

        const priorityData = priorityRes?.data ?? {};
        const dueTop = priorityData.dueTop10 ?? priorityData.due ?? [];
        const expiredTop = priorityData.expiredTop10 ?? priorityData.expired ?? [];
        const notYetTop = priorityData.notYetTop ?? priorityData.notYet ?? [];

        return {
            computedAt: new Date().toISOString(),
            summary,
            kpiStatus,
            composition,
            dueTop,
            expiredTop,
            notYetTop,
        };
    } catch (e) {
        console.error("API error: employee summary/priority", e);
        return {
            computedAt: null,
            summary: {
                employees: { active: 0 },
                certifications: { active: 0, due: 0, expired: 0 },
                batches: { ongoing: 0 },
                eligibility: { total: 0 },
            },
            kpiStatus: { notYetCertified: 0, active: 0, due: 0, expired: 0 },
            composition: [],
            dueTop: [],
            expiredTop: [],
            notYetTop: [],
        };
    }
}

/** KPI khusus pegawai */
export async function fetchEmployeeKpiStatus(params = {}) {
    try {
        const { data } = await api.get(`/dashboard/employee/summary`, { params: cleanParams(params) });
        return mapSummaryToAggregate(data).kpiStatus;
    } catch (e) {
        console.error("API error: employee KPI", e);
        return { notYetCertified: 0, active: 0, due: 0, expired: 0 };
    }
}

/** Ongoing batches (self) lewat endpoint baru /batches/employee/ongoing-paged */
export async function fetchEmployeeOngoingBatchesPaged(params = {}) {
    const { page, size } = params;
    const pg = Number.isInteger(page) ? Number(page) : 0;
    const sz = Number.isInteger(size) ? Number(size) : 10;

    try {
        const { data } = await api.get(`/batches/employee/ongoing-paged`, {
            params: { page: pg, size: sz },
        });
        const content = Array.isArray(data?.content) ? data.content : [];
        return {
            content,
            totalPages: data?.totalPages ?? 0,
            totalElements: data?.totalElements ?? content.length,
        };
    } catch (e) {
        console.error("API error: employee ongoing-batches", e);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

/** Monthly trend khusus pegawai */
export async function fetchEmployeeMonthlyCertificationTrend(params = {}) {
    try {
        const { data } = await api.get(`/dashboard/employee/monthly`, { params: cleanParams(params) });
        return normalizeMonthly(data);
    } catch (e) {
        console.error("API error: employee monthly", e);
        return MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 }));
    }
}
