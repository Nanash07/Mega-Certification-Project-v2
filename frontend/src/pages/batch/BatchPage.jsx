import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import { Plus, Pencil, Trash2, Eye, ChevronDown, Eraser } from "lucide-react";
import { fetchBatches, deleteBatch, searchBatches } from "../../services/batchService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import CreateBatchModal from "../../components/batches/CreateBatchModal";
import EditBatchModal from "../../components/batches/EditBatchModal";

export default function BatchPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [filterBatch, setFilterBatch] = useState(null);
    const [status, setStatus] = useState(null);
    const [certRule, setCertRule] = useState(null);

    // Master options
    const [ruleOptions, setRuleOptions] = useState([]);

    const statusOptions = [
        { value: "PLANNED", label: "Planned" },
        { value: "ONGOING", label: "Ongoing" },
        { value: "FINISHED", label: "Finished" },
        { value: "CANCELED", label: "Canceled" },
    ];

    // Modals
    const [openCreate, setOpenCreate] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

    // 🔹 Floating status menu: { row, x, y }
    const [statusMenu, setStatusMenu] = useState(null);

    const TABLE_COLS = 12; // total kolom tabel

    // Badge jenis batch
    function renderTypeBadge(type) {
        if (!type) return "-";
        const map = {
            CERTIFICATION: { label: "Sertifikasi", cls: "badge-info text-white" },
            TRAINING: { label: "Training", cls: "badge-primary text-white" },
            REFRESHMENT: { label: "Refreshment", cls: "badge-secondary text-white" },
        };
        const m = map[type] || { label: type, cls: "badge-neutral" };
        return <span className={`badge badge-sm ${m.cls}`}>{m.label}</span>;
    }

    // Format status: "PLANNED" -> "Planned"
    function formatStatusLabel(s) {
        if (!s) return "-";
        const val = s.toString().toLowerCase();
        return val.charAt(0).toUpperCase() + val.slice(1);
    }

    // Mapping style status (badge + button)
    function getStatusStyle(status) {
        switch (status) {
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

    // 🔹 Badge status: trigger, dropdown dirender fixed di luar tabel
    function renderStatusBadge(row) {
        if (!row.status) return "-";

        const { label } = getStatusStyle(row.status);
        const badgeCls = getStatusStyle(row.status).badgeCls;

        return (
            <button
                type="button"
                className={`badge badge-sm whitespace-nowrap cursor-pointer flex items-center gap-1 ${badgeCls} text-white`}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStatusMenu({
                        row,
                        x: rect.left,
                        y: rect.bottom + 4, // sedikit di bawah badge
                    });
                }}
            >
                <span>{label}</span>
                <ChevronDown className="w-3 h-3" />
            </button>
        );
    }

    // Async search batches (untuk filter)
    const loadBatches = async (inputValue) => {
        try {
            const res = await searchBatches({ search: inputValue, page: 0, size: 20 });
            return (res.content || []).map((b) => ({ value: b.id, label: `${b.batchName}` }));
        } catch {
            return [];
        }
    };

    // Load Certification Rules
    useEffect(() => {
        fetchCertificationRules()
            .then((rules) => {
                const sorted = [...rules].sort((a, b) => {
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
            })
            .catch(() => toast.error("Gagal memuat certification rules"));
    }, []);

    // Load batch list
    async function load() {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                batchIds: filterBatch ? [filterBatch.value] : undefined,
                status: status?.value,
                certificationRuleId: certRule?.value,
            };
            const res = await fetchBatches(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("Gagal memuat data batch");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, filterBatch, status, certRule]);

    // Reset filter
    function resetFilter() {
        setFilterBatch(null);
        setStatus(null);
        setCertRule(null);
        setPage(1);
        toast.success("Clear filter berhasil");
    }

    // Delete batch
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

    // 🔹 Ubah status batch (sementara update di frontend, lo bisa sambungin ke API)
    async function handleChangeStatus(batch, newStatus) {
        if (batch.status === newStatus) return;

        try {
            // TODO: sambungkan ke API update status batch, contoh:
            // await updateBatchStatus(batch.id, newStatus);

            // Untuk sekarang, update state lokal biar UI ke-refresh
            setRows((prev) => prev.map((r) => (r.id === batch.id ? { ...r, status: newStatus } : r)));
            toast.success(`Status diubah ke ${formatStatusLabel(newStatus)}`);
        } catch {
            toast.error("Gagal mengubah status batch");
        }
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <AsyncSelect
                        cacheOptions
                        defaultOptions
                        loadOptions={loadBatches}
                        value={filterBatch}
                        onChange={setFilterBatch}
                        placeholder="Search Batch"
                        isClearable
                    />
                    <Select
                        options={statusOptions}
                        value={status}
                        onChange={setStatus}
                        placeholder="Filter Status"
                        isClearable
                    />
                    <Select
                        options={ruleOptions}
                        value={certRule}
                        onChange={setCertRule}
                        placeholder="Filter Certification Rule"
                        isClearable
                    />
                    <div className="col-span-1" />
                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-primary btn-sm w-full"
                            onClick={() => setOpenCreate(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Batch
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-accent btn-soft border-accent btn-sm w-full"
                            onClick={resetFilter}
                        >
                            <Eraser className="w-4 h-4" />
                            Clear Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>Nama Batch</th>
                            <th>Jenis</th>
                            <th>Sertifikasi</th>
                            <th>Lembaga</th>
                            <th>Tanggal Mulai</th>
                            <th>Tanggal Selesai</th>
                            <th>Quota</th>
                            <th>Total Peserta</th>
                            <th>Total Lulus</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {loading ? (
                            <tr>
                                <td colSpan={TABLE_COLS} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={TABLE_COLS} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((b, idx) => (
                                <tr key={b.id}>
                                    <td>{startIdx + idx}</td>

                                    {/* Aksi: detail + edit + hapus (icon + tooltip) */}
                                    <td>
                                        <div className="flex gap-2">
                                            {/* Detail */}
                                            <div className="tooltip" data-tip="Lihat detail batch">
                                                <Link
                                                    to={`/batch/${b.id}`}
                                                    className="btn btn-xs btn-info border btn-soft border-info"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Link>
                                            </div>

                                            {/* Edit */}
                                            <div className="tooltip" data-tip="Edit batch">
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-warning btn-soft border-warning"
                                                    onClick={() => setEditItem(b)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Hapus */}
                                            <div className="tooltip" data-tip="Hapus batch">
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-error btn-soft border-error"
                                                    onClick={() => setConfirmDelete({ open: true, id: b.id })}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Nama batch: teks biasa */}
                                    <td>{b.batchName}</td>

                                    <td>{renderTypeBadge(b.type)}</td>
                                    <td>
                                        {[
                                            b.certificationCode,
                                            b.certificationLevelName,
                                            b.subFieldCode ?? b.subBidangCode,
                                        ]
                                            .filter((x) => x && String(x).trim() !== "")
                                            .join(" - ") || "-"}
                                    </td>
                                    <td>{b.institutionName || "-"}</td>
                                    <td>{b.startDate ? new Date(b.startDate).toLocaleDateString("id-ID") : "-"}</td>
                                    <td>{b.endDate ? new Date(b.endDate).toLocaleDateString("id-ID") : "-"}</td>
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

            {/* Pagination */}
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

            {/* Modals */}
            <CreateBatchModal open={openCreate} onClose={() => setOpenCreate(false)} onSaved={load} />
            <EditBatchModal open={!!editItem} data={editItem} onClose={() => setEditItem(null)} onSaved={load} />

            {/* Confirm Delete Modal */}
            <dialog className="modal" open={confirmDelete.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Hapus Batch?</h3>
                    <p className="py-2">Batch ini akan dihapus dari sistem.</p>
                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setConfirmDelete({ open: false, id: null })}
                        >
                            Batal
                        </button>
                        <button type="button" className="btn btn-error" onClick={() => handleDelete(confirmDelete.id)}>
                            Hapus
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setConfirmDelete({ open: false, id: null })}>close</button>
                </form>
            </dialog>

            {/* 🔹 Floating status menu (fixed, di atas semua layer, gak ngubah tabel) */}
            {statusMenu && (
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
