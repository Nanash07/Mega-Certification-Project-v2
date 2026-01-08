import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";

import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getCurrentRole, formatDate } from "../../utils/helpers";
import { Plus, Pencil, Trash2, Eye, ChevronDown, Eraser, Download, Package } from "lucide-react";

import { fetchBatches, deleteBatch, searchBatches, updateBatch, exportBatchesExcel } from "../../services/batchService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchMyPicScope } from "../../services/picScopeService";
import CreateBatchModal from "../../components/batches/CreateBatchModal";
import EditBatchModal from "../../components/batches/EditBatchModal";

function formatDateId(dateLike) {
    if (!dateLike) return "-";
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "-";

    const s = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);

    return s
        .replace(/\./g, "")
        .split(" ")
        .map((p, i) => (i === 1 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
        .join(" ");
}

export default function BatchPage() {
    const [role] = useState(() => getCurrentRole());
    const isSuperadmin = role === "SUPERADMIN";
    const isPic = role === "PIC";
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [filterBatch, setFilterBatch] = useState(null);
    const [status, setStatus] = useState(null);
    const [type, setType] = useState(null);
    const [certRule, setCertRule] = useState(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [ruleOptions, setRuleOptions] = useState([]);

    const statusOptions = useMemo(
        () => [
            { value: "PLANNED", label: "Planned" },
            { value: "ONGOING", label: "Ongoing" },
            { value: "FINISHED", label: "Finished" },
            { value: "CANCELED", label: "Canceled" },
        ],
        []
    );

    const typeOptions = useMemo(
        () => [
            { value: "CERTIFICATION", label: "Sertifikasi" },
            { value: "TRAINING", label: "Training" },
            { value: "REFRESHMENT", label: "Refreshment" },
            { value: "EXTENSION", label: "Perpanjang" },
        ],
        []
    );

    const [openCreate, setOpenCreate] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

    const [statusMenu, setStatusMenu] = useState(null);

    const TABLE_COLS = 12;

    function renderTypeBadge(t) {
        if (!t) return "-";
        const map = {
            CERTIFICATION: { label: "Sertifikasi", cls: "badge-info text-white" },
            TRAINING: { label: "Training", cls: "badge-primary text-white" },
            REFRESHMENT: { label: "Refreshment", cls: "badge-secondary text-white" },
            EXTENSION: { label: "Perpanjang", cls: "badge-success text-white" },
        };
        const m = map[t] || { label: t, cls: "badge-neutral" };
        return <span className={`badge badge-sm ${m.cls}`}>{m.label}</span>;
    }

    function formatStatusLabel(s) {
        if (!s) return "-";
        const val = s.toString().toLowerCase();
        return val.charAt(0).toUpperCase() + val.slice(1);
    }

    function getStatusStyle(st) {
        switch (st) {
            case "PLANNED":
                return { label: "Planned", badgeCls: "badge-warning", btnCls: "btn-warning" };
            case "ONGOING":
                return { label: "Ongoing", badgeCls: "badge-info", btnCls: "btn-info" };
            case "FINISHED":
                return { label: "Finished", badgeCls: "badge-success", btnCls: "btn-success" };
            case "CANCELED":
            default:
                return { label: "Canceled", badgeCls: "badge-error", btnCls: "btn-error" };
        }
    }

    function renderStatusBadge(row) {
        if (!row.status) return "-";
        const { label, badgeCls } = getStatusStyle(row.status);

        if (isEmployee) {
            return <span className={`badge badge-sm whitespace-nowrap ${badgeCls} text-white`}>{label}</span>;
        }

        return (
            <button
                type="button"
                className={`badge badge-sm whitespace-nowrap cursor-pointer flex items-center gap-1 ${badgeCls} text-white`}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStatusMenu({
                        row,
                        x: rect.left + window.scrollX,
                        y: rect.bottom + window.scrollY + 4,
                    });
                }}
            >
                <span>{label}</span>
                <ChevronDown className="w-3 h-3" />
            </button>
        );
    }

    const loadBatches = async (inputValue) => {
        try {
            const res = await searchBatches({ search: inputValue, page: 0, size: 20 });
            return (res.content || []).map((b) => ({ value: b.id, label: `${b.batchName}` }));
        } catch {
            return [];
        }
    };

    useEffect(() => {
        if (isEmployee) return;

        async function loadRules() {
            try {
                const rules = await fetchCertificationRules();
                let filtered = rules || [];

                if (isPic) {
                    try {
                        const scope = await fetchMyPicScope();
                        const scopeCerts = scope?.certifications || [];
                        const allowedCodes = new Set(
                            scopeCerts
                                .map((c) => c.certificationCode)
                                .filter((code) => code && String(code).trim() !== "")
                        );
                        filtered = filtered.filter((r) => allowedCodes.has(r.certificationCode));
                    } catch (e) {
                        console.error("load PIC scope error", e);
                        toast.error("Gagal memuat scope sertifikasi PIC");
                    }
                }

                const sorted = [...filtered].sort((a, b) => {
                    const keyA = `${a.certificationCode || ""} ${a.certificationLevelName || ""} ${
                        a.subFieldCode || ""
                    }`.toLowerCase();
                    const keyB = `${b.certificationCode || ""} ${b.certificationLevelName || ""} ${
                        b.subFieldCode || ""
                    }`.toLowerCase();
                    return keyA.localeCompare(keyB);
                });

                setRuleOptions(
                    sorted.map((r) => {
                        const parts = [r.certificationCode, r.certificationLevelName, r.subFieldCode].filter(
                            (x) => x && x.trim() !== ""
                        );
                        return { value: r.id, label: parts.join(" - ") };
                    })
                );
            } catch (e) {
                console.error("load rules error", e);
                toast.error("Gagal memuat certification rules");
            }
        }

        loadRules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPic, isEmployee, isSuperadmin]);

    async function load() {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                batchIds: filterBatch ? [filterBatch.value] : undefined,
                status: status?.value,
                type: type?.value,
                certificationRuleId: certRule?.value,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            };

            const res = await fetchBatches(params);
            const content = res.content || [];

            if (isEmployee) {
                const uniqueRules = new Map();
                content.forEach((b) => {
                    if (!b.certificationRuleId) return;
                    const id = b.certificationRuleId;
                    if (uniqueRules.has(id)) return;

                    const labelParts = [
                        b.certificationCode,
                        b.certificationLevelName,
                        b.subFieldCode ?? b.subBidangCode,
                    ].filter((x) => x && String(x).trim() !== "");

                    uniqueRules.set(id, { value: id, label: labelParts.join(" - ") });
                });
                setRuleOptions(Array.from(uniqueRules.values()));
            }

            setRows(content);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch (e) {
            console.error("load batches error", e);
            toast.error("Gagal memuat data batch");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, filterBatch, status, type, certRule, startDate, endDate]);

    function resetFilter() {
        setFilterBatch(null);
        setStatus(null);
        setType(null);
        setCertRule(null);
        setStartDate("");
        setEndDate("");
        setPage(1);
        toast.success("Clear filter berhasil");
    }

    async function handleExport() {
        if (exporting) return;

        setExporting(true);
        try {
            await exportBatchesExcel({
                batchIds: filterBatch ? [filterBatch.value] : undefined,
                status: status?.value,
                type: type?.value,
                certificationRuleId: certRule?.value,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
            toast.success("Export berhasil");
        } catch (err) {
            console.error("export batches error:", err);
            toast.error(err?.response?.data?.message || "Gagal export excel");
        } finally {
            setExporting(false);
        }
    }

    async function handleDelete(id) {
        try {
            await deleteBatch(id);
            toast.success("Batch berhasil dihapus");
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal menghapus batch");
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    }

    async function handleChangeStatus(batch, newStatus) {
        if (isEmployee) return;
        if (batch.status === newStatus) return;

        try {
            await updateBatch(batch.id, { status: newStatus });
            await load();
            toast.success(`Status diubah ke ${formatStatusLabel(newStatus)}`);
        } catch (err) {
            console.error("handleChangeStatus error:", err);
            toast.error(err?.response?.data?.message || "Gagal mengubah status batch");
        }
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Kelola Batch</h1>
                    <p className="text-xs text-gray-500">{totalElements} batch terdaftar</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {!isEmployee && (
                        <>
                            <button
                                className="btn btn-sm btn-primary rounded-lg"
                                onClick={() => setOpenCreate(true)}
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Batch
                            </button>
                            <button
                                className={`btn btn-sm btn-neutral rounded-lg ${exporting ? "btn-disabled" : ""}`}
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <span className="loading loading-spinner loading-xs" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                {exporting ? "Exporting..." : "Export Excel"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Search Batch</label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={loadBatches}
                            value={filterBatch}
                            onChange={(v) => {
                                setFilterBatch(v);
                                setPage(1);
                            }}
                            placeholder="Cari batch"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Status</label>
                        <Select
                            options={statusOptions}
                            value={status}
                            onChange={(v) => {
                                setStatus(v);
                                setPage(1);
                            }}
                            placeholder="Pilih status"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Jenis</label>
                        <Select
                            options={typeOptions}
                            value={type}
                            onChange={(v) => {
                                setType(v);
                                setPage(1);
                            }}
                            placeholder="Pilih jenis"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Rule Sertifikasi</label>
                        <Select
                            options={ruleOptions}
                            value={certRule}
                            onChange={(v) => {
                                setCertRule(v);
                                setPage(1);
                            }}
                            placeholder="Pilih rule"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Tanggal Mulai</label>
                        <input
                            type="date"
                            className="input input-sm input-bordered w-full rounded-lg"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Tanggal Selesai</label>
                        <input
                            type="date"
                            className="input input-sm input-bordered w-full rounded-lg"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-3">
                    <button
                        className="btn btn-sm btn-accent btn-soft rounded-lg flex gap-2"
                        onClick={resetFilter}
                    >
                        <Eraser className="w-4 h-4" />
                        Clear Filter
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead className="bg-base-200 text-xs">
                            <tr>
                                <th className="w-12">No</th>
                                <th className="w-28">Aksi</th>
                                <th>Nama Batch</th>
                                <th>Jenis</th>
                                <th>Sertifikasi</th>
                                <th>Lembaga</th>
                                <th>Tanggal Mulai</th>
                                <th>Tanggal Selesai</th>
                                <th>Quota</th>
                                <th>Peserta</th>
                                <th>Lulus</th>
                                <th className="w-28">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={TABLE_COLS} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLS} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Package size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data batch</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((b, idx) => (
                                    <tr key={b.id} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <div className="tooltip" data-tip="Lihat detail batch">
                                                    <Link
                                                        to={`/batch/${b.id}`}
                                                        className="btn btn-xs btn-info btn-soft border border-info rounded-lg"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                                {!isEmployee && (
                                                    <>
                                                        <div className="tooltip" data-tip="Edit batch">
                                                            <button
                                                                className="btn btn-xs btn-warning btn-soft border border-warning rounded-lg"
                                                                onClick={() => setEditItem(b)}
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <div className="tooltip" data-tip="Hapus batch">
                                                            <button
                                                                className="btn btn-xs btn-error btn-soft border border-error rounded-lg"
                                                                onClick={() => setConfirmDelete({ open: true, id: b.id })}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-medium">{b.batchName}</td>
                                        <td>{renderTypeBadge(b.type)}</td>
                                        <td>
                                            {[b.certificationCode, b.certificationLevelName, b.subFieldCode ?? b.subBidangCode]
                                                .filter((x) => x && String(x).trim() !== "")
                                                .join(" - ") || "-"}
                                        </td>
                                        <td>{b.institutionName || "-"}</td>
                                        <td>{formatDateId(b.startDate)}</td>
                                        <td>{formatDateId(b.endDate)}</td>
                                        <td>{b.quota ?? "-"}</td>
                                        <td>{b.totalParticipants ?? 0}</td>
                                        <td>{b.totalPassed ?? 0}</td>
                                        <td>{renderStatusBadge(b)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination inside card */}
                {rows.length > 0 && (
                    <div className="border-t border-gray-100 p-3">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalElements={totalElements}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setPage}
                            onRowsPerPageChange={(val) => {
                                setRowsPerPage(val);
                                setPage(1);
                            }}
                        />
                    </div>
                )}
            </div>

            <CreateBatchModal open={openCreate} onClose={() => setOpenCreate(false)} onSaved={load} />
            <EditBatchModal open={!!editItem} data={editItem} onClose={() => setEditItem(null)} onSaved={load} />

            <ConfirmDialog
                open={confirmDelete.open}
                title="Hapus Batch?"
                message="Batch ini akan dihapus dari sistem."
                onConfirm={() => handleDelete(confirmDelete.id)}
                onCancel={() => setConfirmDelete({ open: false, id: null })}
            />

            {statusMenu && !isEmployee && (
                <div className="fixed inset-0 z-[999]" onClick={() => setStatusMenu(null)}>
                    <div
                        className="absolute"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-2xl p-3 text-xs flex flex-col gap-2">
                            {["PLANNED", "ONGOING", "FINISHED", "CANCELED"].map((st) => {
                                const { label, btnCls } = getStatusStyle(st);
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        className={`btn btn-xs ${btnCls} text-white rounded-full w-full justify-center`}
                                        onClick={async () => {
                                            await handleChangeStatus(statusMenu.row, st);
                                            setStatusMenu(null);
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
