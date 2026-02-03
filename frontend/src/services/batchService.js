import api from "./api";

const BASE = "/batches";

function buildParams(params = {}) {
    const q = {};
    const set = (k, v) => {
        if (v === undefined || v === null || v === "") return;
        if (Array.isArray(v)) q[k] = v.join(",");
        else q[k] = v;
    };

    set("page", params.page);
    set("size", params.size);

    set("batchIds", params.batchIds);
    set("status", params.status);

    const resolvedType = params.type ?? params.batchType;
    set("type", resolvedType);

    set("certificationRuleId", params.certificationRuleId);
    set("institutionId", params.institutionId);
    set("search", params.search);

    set("regionalId", params.regionalId);
    set("divisionId", params.divisionId);
    set("unitId", params.unitId);
    set("certificationId", params.certificationId);
    set("levelId", params.levelId);
    set("subFieldId", params.subFieldId);

    set("startDate", params.startDate);
    set("endDate", params.endDate);

    if (params.sortField) {
        q.sort = `${params.sortField},${params.sortDirection || "asc"}`;
    }

    return q;
}

function todayYmd() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function safeSlug(s) {
    return String(s || "")
        .trim()
        .replace(/[^\w.-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function ensureXlsx(name) {
    if (!name) return "batches.xlsx";
    return name.toLowerCase().endsWith(".xlsx") ? name : `${name}.xlsx`;
}

function hasDateToken(name) {
    return /\b\d{4}[-_]\d{2}[-_]\d{2}\b/.test(name) || /\b\d{8}\b/.test(name);
}

function getFilenameFromDisposition(disposition) {
    if (!disposition) return null;

    const utf = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
    if (utf?.[1]) {
        try {
            return decodeURIComponent(utf[1].trim());
        } catch {
            return utf[1].trim();
        }
    }

    const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition);
    if (plain?.[1]) {
        try {
            return decodeURIComponent(plain[1].trim());
        } catch {
            return plain[1].trim();
        }
    }

    return null;
}

function makeDatedFilename(params = {}, headerFilename) {
    const dateKey =
        params?.startDate && params?.endDate
            ? `${params.startDate}_to_${params.endDate}`
            : params?.startDate
            ? `${params.startDate}`
            : params?.endDate
            ? `${params.endDate}`
            : todayYmd();

    const datePart = safeSlug(dateKey);

    if (headerFilename) {
        const clean = ensureXlsx(headerFilename);
        if (hasDateToken(clean)) return clean;
        const base = clean.replace(/\.xlsx$/i, "");
        return `${base}-${datePart}.xlsx`;
    }

    return `batches-${datePart}.xlsx`;
}

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ensureXlsx(filename || "batches.xlsx");
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

export async function fetchBatches(params = {}) {
    try {
        const { data } = await api.get(`${BASE}/paged`, { params: buildParams(params) });
        return (
            data || {
                content: [],
                totalPages: 0,
                totalElements: 0,
            }
        );
    } catch (err) {
        console.error("fetchBatches error:", err);
        return { content: [], totalPages: 0, totalElements: 0 };
    }
}

export async function createBatch(payload) {
    const { data } = await api.post(BASE, payload);
    return data;
}

// Get next sequence number for batch name auto-generation
export async function fetchNextBatchSequence(prefix) {
    try {
        const { data } = await api.get(`${BASE}/next-sequence`, { params: { prefix } });
        return data?.nextSequence || 1;
    } catch {
        return 1;
    }
}

export async function updateBatch(id, payload) {
    const { data } = await api.put(`${BASE}/${id}`, payload);
    return data;
}

export async function deleteBatch(id) {
    await api.delete(`${BASE}/${id}`);
    return true;
}

export async function searchBatches({ search, page = 0, size = 20, type } = {}) {
    const { data } = await api.get(`${BASE}/paged`, {
        params: buildParams({ search, page, size, type }),
    });
    return (
        data || {
            content: [],
            totalPages: 0,
            totalElements: 0,
        }
    );
}

export async function fetchBatchById(id) {
    const { data } = await api.get(`${BASE}/${id}`);
    return data || null;
}

export async function sendBatchNotifications(batchId, { status } = {}) {
    const { data } = await api.post(`/notifications/batches/${batchId}/send`, null, {
        params: status ? { status } : {},
    });
    return typeof data === "number" ? data : data?.sent ?? 0;
}

export async function fetchEmployeeOngoingBatchesPaged({ page = 0, size = 10 } = {}) {
    const { data } = await api.get(`${BASE}/employee/ongoing-paged`, {
        params: { page, size },
    });
    return (
        data || {
            content: [],
            totalPages: 0,
            totalElements: 0,
        }
    );
}

export async function fetchMonthlyBatches(params = {}) {
    const q = {};
    const set = (k, v) => {
        if (v === undefined || v === null || v === "") return;
        q[k] = v;
    };

    set("regionalId", params.regionalId);
    set("divisionId", params.divisionId);
    set("unitId", params.unitId);
    set("certificationId", params.certificationId);
    set("levelId", params.levelId);
    set("subFieldId", params.subFieldId);
    set("startDate", params.startDate);
    set("endDate", params.endDate);

    const resolvedType = params.type ?? params.batchType;
    set("type", resolvedType);

    const { data } = await api.get(`${BASE}/monthly`, { params: q });
    return Array.isArray(data) ? data : [];
}

export async function fetchBatchCount(params = {}) {
    const q = {};
    const set = (k, v) => {
        if (v === undefined || v === null || v === "") return;
        if (Array.isArray(v)) q[k] = v.join(",");
        else q[k] = v;
    };

    set("status", params.status);
    set("statuses", params.statuses);
    set("type", params.type ?? params.batchType);
    set("regionalId", params.regionalId);
    set("divisionId", params.divisionId);
    set("unitId", params.unitId);
    set("certificationId", params.certificationId);
    set("levelId", params.levelId);
    set("subFieldId", params.subFieldId);
    set("startDate", params.startDate);
    set("endDate", params.endDate);

    const { data } = await api.get(`${BASE}/dashboard-count`, { params: q });
    return Number(data?.count ?? 0);
}

export async function exportBatchesExcel(params = {}) {
    const res = await api.get(`${BASE}/export-excel`, {
        params: buildParams(params),
        responseType: "blob",
        transformResponse: (r) => r,
    });

    const headerName = getFilenameFromDisposition(res?.headers?.["content-disposition"]);
    const filename = makeDatedFilename(params, headerName);

    const blob = new Blob([res.data], {
        type: res?.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    downloadBlob(blob, filename);
    return true;
}

export async function exportBatchParticipants(id, batchName) {
    const res = await api.get(`${BASE}/${id}/export-participants`, {
        responseType: "blob",
        transformResponse: (r) => r,
    });

    const safeName = batchName ? safeSlug(batchName) : id;
    const filename = `batch_${safeName}.xlsx`;

    const blob = new Blob([res.data], {
        type: res?.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    downloadBlob(blob, filename);
    return true;
}
