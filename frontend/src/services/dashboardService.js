// src/services/dashboardService.js
import api from "./api";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Buang param null/undefined/"" supaya query clean */
const cleanParams = (obj = {}) =>
    Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined && v !== ""));

/** Normalisasi data bulanan dari berbagai bentuk respons */
function normalizeMonthly(raw) {
    const byIdx = Array(12).fill(0);
    if (!raw) return MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 }));

    // 1) Array item: {month|m|monthIndex, count|total|value}
    const arr = Array.isArray(raw) ? raw : raw?.months && Array.isArray(raw.months) ? raw.months : null;
    if (arr) {
        arr.forEach((it) => {
            const m = Number(it.month ?? it.m ?? it.monthIndex);
            const c = Number(it.count ?? it.total ?? it.value ?? 0);
            if (m >= 1 && m <= 12) byIdx[m - 1] = c;
        });
    } else if (typeof raw === "object") {
        // 2) Map: { "1": 0, "2": 2, ... }
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

    // certifiedCount dari BE = yang valid (ACTIVE + DUE)
    const certifiedIncDue = Number(summary?.certifiedCount ?? 0);
    const dueCount = Number(summary?.dueCount ?? 0);
    const expiredCount = Number(summary?.expiredCount ?? 0);
    const notYetCount = Number(summary?.notYetCount ?? 0);
    const eligibleTotal = Number(summary?.eligiblePopulation ?? 0);
    const ongoingBatchCnt = Number(summary?.ongoingBatchCount ?? 0);

    // ACTIVE only = certified - due
    const activeOnly = Math.max(0, certifiedIncDue - dueCount);

    return {
        // untuk mini card:
        summary: {
            employees: { active: employeeCount },
            certifications: {
                // tampilkan TTF (certified termasuk DUE)
                active: certifiedIncDue,
                due: dueCount,
                expired: expiredCount,
            },
            batches: { ongoing: ongoingBatchCnt },
            // kasih tau total eligibility kalau nanti mau dipakai langsung
            eligibility: { total: eligibleTotal },
        },

        // untuk donut KPI:
        kpiStatus: {
            notYetCertified: notYetCount,
            active: activeOnly, // cuma ACTIVE
            due: dueCount,
            expired: expiredCount,
        },

        // komposisi sederhana
        composition: [
            { key: "CERTIFIED", label: "Tersertifikasi", value: certifiedIncDue },
            { key: "NOT_YET", label: "Belum", value: notYetCount },
        ],
    };
}

/** Aggregate builder: panggil beberapa endpoint BE dan gabungkan */
export async function fetchDashboardAggregate(params = {}) {
    // year udah gak dipakai di BE, jadi kita abaikan aja di sini
    const { page, size, ...filters } = params;
    const q = cleanParams(filters);
    const pg = Number.isInteger(page) ? Number(page) : 0;
    const sz = Number.isInteger(size) ? Number(size) : 10;

    try {
        const [summaryRes, monthlyRes, ongoingRes, priorityRes] = await Promise.all([
            api.get(`/dashboard/summary`, { params: q }),
            api.get(`/dashboard/monthly`, { params: q }), // kirim filter apa adanya (bisa ada startDate/endDate/batchType)
            api.get(`/dashboard/ongoing-batches`, { params: q }),
            api.get(`/dashboard/priority`, { params: q }),
        ]);

        const { summary, kpiStatus, composition } = mapSummaryToAggregate(summaryRes?.data);
        const monthlyTrend = normalizeMonthly(monthlyRes?.data);

        const list = Array.isArray(ongoingRes?.data) ? ongoingRes.data : [];
        const totalElements = list.length;
        const totalPages = Math.max(1, Math.ceil(totalElements / sz));
        const start = pg * sz;
        const content = list.slice(start, start + sz);

        const priorityData = priorityRes?.data ?? {};
        const dueTop = priorityData.dueTop10 ?? priorityData.due ?? [];
        const expiredTop = priorityData.expiredTop10 ?? priorityData.expired ?? [];
        // kalau nanti butuh notYet:
        // const notYetTop = priorityData.notYet ?? [];

        return {
            computedAt: new Date().toISOString(),
            summary,
            kpiStatus,
            composition,
            ongoingBatchesPage: { content, totalPages, totalElements },
            dueTop,
            expiredTop,
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
            ongoingBatchesPage: { content: [], totalPages: 0, totalElements: 0 },
            dueTop: [],
            expiredTop: [],
            monthlyTrend: MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 })),
        };
    }
}

/* ==== Wrapper yang lebih spesifik ==== */
export async function fetchDashboardSummary(params = {}) {
    const { ...filters } = params;
    try {
        const [summaryRes, priorityRes] = await Promise.all([
            api.get(`/dashboard/summary`, { params: cleanParams(filters) }),
            api.get(`/dashboard/priority`, { params: cleanParams(filters) }),
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
        console.error("API error: GET /dashboard/summary or /priority", e);
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
        const { data } = await api.get(`/dashboard/summary`, { params: cleanParams(params) });
        return mapSummaryToAggregate(data).kpiStatus;
    } catch (e) {
        console.error("API error: KPI", e);
        return { notYetCertified: 0, active: 0, due: 0, expired: 0 };
    }
}

export async function fetchOngoingBatchesPaged(params = {}) {
    const { page, size, ...filters } = params;
    const pg = Number.isInteger(page) ? Number(page) : 0;
    const sz = Number.isInteger(size) ? Number(size) : 10;
    try {
        const { data } = await api.get(`/dashboard/ongoing-batches`, { params: cleanParams(filters) });
        const list = Array.isArray(data) ? data : [];
        const totalElements = list.length;
        const totalPages = Math.max(1, Math.ceil(totalElements / sz));
        const content = list.slice(pg * sz, pg * sz + sz);
        return { content, totalPages, totalElements };
    } catch (e) {
        console.error("API error: ongoing-batches", e);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function fetchMonthlyCertificationTrend(params = {}) {
    // year udah gak relevan, tapi kalau masih dikirim dari caller akan diabaikan oleh BE
    try {
        const { data } = await api.get(`/dashboard/monthly`, { params: cleanParams(params) });
        return normalizeMonthly(data);
    } catch (e) {
        console.error("API error: monthly", e);
        return MONTHS.map((label, i) => ({ month: i + 1, label, count: 0 }));
    }
}

/** (Opsional) Ambil opsi filter untuk dropdown FE */
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
