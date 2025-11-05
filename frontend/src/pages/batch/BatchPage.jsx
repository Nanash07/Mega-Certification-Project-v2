// src/pages/batches/BatchPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import { Plus } from "lucide-react";
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

    // Async search batches
    const loadBatches = async (inputValue) => {
        try {
            const res = await searchBatches({ search: inputValue, page: 0, size: 20 });
            return res.content.map((b) => ({
                value: b.id,
                label: `${b.batchName}`,
            }));
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
                        return {
                            value: r.id,
                            label: parts.join(" - "),
                        };
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
                batchIds: filterBatch ? [filterBatch.value] : [],
                status: status ? status.value : null,
                certificationRuleId: certRule ? certRule.value : null,
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
                    <div className="col-span-1"></div>
                    <div className="col-span-1">
                        <button className="btn btn-primary btn-sm w-full" onClick={() => setOpenCreate(true)}>
                            <Plus className="w-4 h-4" />
                            Tambah Batch
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
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
                                <td colSpan={11} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((b, idx) => (
                                <tr key={b.id}>
                                    <td>{startIdx + idx}</td>
                                    <td className="flex gap-2">
                                        <button
                                            className="btn btn-xs btn-warning btn-soft border-warning"
                                            onClick={() => setEditItem(b)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-xs btn-error btn-soft border-error"
                                            onClick={() => setConfirmDelete({ open: true, id: b.id })}
                                        >
                                            Hapus
                                        </button>
                                    </td>
                                    <td>
                                        <Link to={`/batch/${b.id}`} className="underline hover:text-secondary">
                                            {b.batchName}
                                        </Link>
                                    </td>
                                    <td>
                                        {b.certificationName}
                                        {b.certificationLevelName ? ` - ${b.certificationLevelName}` : ""}
                                    </td>
                                    <td>{b.institutionName || "-"}</td>
                                    <td>{b.startDate ? new Date(b.startDate).toLocaleDateString("id-ID") : "-"}</td>
                                    <td>{b.endDate ? new Date(b.endDate).toLocaleDateString("id-ID") : "-"}</td>
                                    <td>{b.quota || "-"}</td>
                                    <td>{b.totalParticipants ?? 0}</td>
                                    <td>{b.totalPassed ?? 0}</td>
                                    <td>
                                        <span
                                            className={`badge badge-sm text-white ${
                                                b.status === "PLANNED"
                                                    ? "badge-info"
                                                    : b.status === "ONGOING"
                                                    ? "badge-warning"
                                                    : b.status === "FINISHED"
                                                    ? "badge-success"
                                                    : "badge-error"
                                            }`}
                                        >
                                            {b.status}
                                        </span>
                                    </td>
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
                        <button className="btn" onClick={() => setConfirmDelete({ open: false, id: null })}>
                            Batal
                        </button>
                        <button className="btn btn-error" onClick={() => handleDelete(confirmDelete.id)}>
                            Hapus
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setConfirmDelete({ open: false, id: null })}>close</button>
                </form>
            </dialog>
        </div>
    );
}
