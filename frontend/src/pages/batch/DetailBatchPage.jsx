// src/pages/batches/DetailBatchPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    fetchEmployeeBatchesPaged,
    updateEmployeeBatchStatus,
    deleteEmployeeFromBatch,
} from "../../services/employeeBatchService";
import { fetchBatchById } from "../../services/batchService";
import AddEmployeeBatchModal from "../../components/batches/AddEmployeeBatchModal";
import Pagination from "../../components/common/Pagination";
import { ArrowLeft, Plus } from "lucide-react";
import Select from "react-select";

export default function DetailBatchPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [batch, setBatch] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(false);

    // pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [openAdd, setOpenAdd] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

    // filters
    const [filterEmployee, setFilterEmployee] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);

    const statusOptions = [
        { value: "REGISTERED", label: "Registered" },
        { value: "ATTENDED", label: "Attended" },
        { value: "PASSED", label: "Passed" },
        { value: "FAILED", label: "Failed" },
    ];

    // ================== LOAD DATA ==================
    async function loadData() {
        setLoading(true);
        try {
            const [batchData, pagedData] = await Promise.all([
                fetchBatchById(id),
                fetchEmployeeBatchesPaged({
                    batchId: id,
                    page: page - 1,
                    size: rowsPerPage,
                    search: filterEmployee ? filterEmployee.label : null,
                    status: filterStatus ? filterStatus.value : null,
                }),
            ]);
            setBatch(batchData);
            setParticipants(pagedData.content || []);
            setTotalPages(pagedData.totalPages || 1);
            setTotalElements(pagedData.totalElements || 0);
        } catch {
            toast.error("Gagal memuat data batch");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [id, page, rowsPerPage, filterEmployee, filterStatus]);

    // ================== HANDLERS ==================
    async function handleUpdateStatus(pid, status) {
        try {
            const updated = await updateEmployeeBatchStatus(pid, status);
            toast.success("Status peserta diperbarui");

            setParticipants((prev) => prev.map((p) => (p.id === pid ? { ...p, ...updated } : p)));
        } catch {
            toast.error("Gagal update status");
        }
    }

    async function handleDelete(pid) {
        try {
            await deleteEmployeeFromBatch(pid);
            toast.success("Peserta dihapus");
            loadData(); // reload biar quota & total peserta update
        } catch {
            toast.error("Gagal hapus peserta");
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    }

    // ================== FILTER OPTIONS ==================
    const employeeOptions = useMemo(
        () =>
            participants.map((p) => ({
                value: p.id,
                label: `${p.employeeNip} - ${p.employeeName}`,
            })),
        [participants]
    );

    function resetFilter() {
        setFilterEmployee(null);
        setFilterStatus(null);
        setPage(1);
        toast.success("Filter direset");
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    // ================== RENDER ==================
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <button className="btn btn-sm btn-accent flex items-center gap-1" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </button>
                <h2 className="text-xl font-bold mt-2">Detail Batch</h2>
            </div>

            {/* Batch Info */}
            {batch && (
                <div className="card bg-base-100 shadow border border-gray-200">
                    <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 text-sm">
                        <div>
                            <span className="font-bold">Nama Batch:</span>
                            <div>{batch.batchName}</div>
                        </div>
                        <div>
                            <span className="font-bold">Sertifikasi:</span>
                            <div>
                                {batch.certificationName}
                                {batch.certificationLevelName ? ` - ${batch.certificationLevelName}` : ""}
                            </div>
                        </div>
                        <div>
                            <span className="font-bold">Lembaga:</span>
                            <div>{batch.institutionName || "-"}</div>
                        </div>
                        <div>
                            <span className="font-bold">Tanggal Mulai:</span>
                            <div>{batch.startDate ? new Date(batch.startDate).toLocaleDateString("id-ID") : "-"}</div>
                        </div>
                        <div>
                            <span className="font-bold">Tanggal Selesai:</span>
                            <div>{batch.endDate ? new Date(batch.endDate).toLocaleDateString("id-ID") : "-"}</div>
                        </div>
                        <div>
                            <span className="font-bold">Quota:</span>
                            <div>{batch.quota ?? "-"}</div>
                        </div>
                        <div>
                            <span className="font-bold">Total Peserta:</span>
                            <div>{batch.totalParticipants ?? 0}</div>
                        </div>
                        <div>
                            <span className="font-bold">Total Lulus:</span>
                            <div>{batch.totalPassed ?? 0}</div>
                        </div>
                        <div>
                            <span className="font-bold">Status:</span>
                            <div>
                                <span
                                    className={`badge badge-sm text-white ${
                                        batch.status === "PLANNED"
                                            ? "badge-info"
                                            : batch.status === "ONGOING"
                                            ? "badge-warning"
                                            : batch.status === "FINISHED"
                                            ? "badge-success"
                                            : "badge-error"
                                    }`}
                                >
                                    {batch.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters + Tambah Peserta */}
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <Select
                        options={employeeOptions}
                        value={filterEmployee}
                        onChange={setFilterEmployee}
                        placeholder="Filter Nama/NIP"
                        isClearable
                    />
                    <Select
                        options={statusOptions}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        placeholder="Filter Status"
                        isClearable
                    />
                    <div className="col-span-1">
                        <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
                            Clear Filter
                        </button>
                    </div>
                    <div className="col-span-2"></div>
                    <div className="col-span-1">
                        <button
                            className="btn btn-primary btn-sm w-full flex items-center gap-1"
                            onClick={() => setOpenAdd(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Peserta
                        </button>
                    </div>
                </div>
            </div>

            {/* Participants Table */}
            <div className="card bg-base-100 shadow border border-gray-200">
                <div className="card-body p-0">
                    <table className="table table-zebra text-sm">
                        <thead className="bg-base-200">
                            <tr>
                                <th>No</th>
                                <th>NIP</th>
                                <th>Nama</th>
                                <th>Status</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10">
                                        <span className="loading loading-dots loading-md" />
                                    </td>
                                </tr>
                            ) : participants.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center text-gray-400 py-10">
                                        Tidak ada peserta
                                    </td>
                                </tr>
                            ) : (
                                participants.map((p, idx) => (
                                    <tr key={p.id}>
                                        <td>{startIdx + idx}</td>
                                        <td>{p.employeeNip}</td>
                                        <td>{p.employeeName}</td>
                                        <td>
                                            <span
                                                className={`badge badge-sm text-white ${
                                                    p.status === "REGISTERED"
                                                        ? "badge-info"
                                                        : p.status === "ATTENDED"
                                                        ? "badge-warning"
                                                        : p.status === "PASSED"
                                                        ? "badge-success"
                                                        : p.status === "FAILED"
                                                        ? "badge-error"
                                                        : "badge-neutral"
                                                }`}
                                            >
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="flex justify-center gap-2">
                                            {p.status === "REGISTERED" && (
                                                <button
                                                    className="btn btn-xs btn-warning btn-soft border-warning"
                                                    onClick={() => handleUpdateStatus(p.id, "ATTENDED")}
                                                >
                                                    Attend
                                                </button>
                                            )}

                                            {p.status === "ATTENDED" && (
                                                <>
                                                    <button
                                                        className="btn btn-xs btn-success btn-soft border-success"
                                                        onClick={() => handleUpdateStatus(p.id, "PASSED")}
                                                    >
                                                        Passed
                                                    </button>
                                                    <button
                                                        className="btn btn-xs btn-error btn-soft border-error"
                                                        onClick={() => handleUpdateStatus(p.id, "FAILED")}
                                                    >
                                                        Failed
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                className="btn btn-xs btn-neutral btn-soft border-neutral"
                                                onClick={() => setConfirmDelete({ open: true, id: p.id })}
                                            >
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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

            {/* Modal Tambah Peserta */}
            <AddEmployeeBatchModal open={openAdd} batchId={id} onClose={() => setOpenAdd(false)} onSaved={loadData} />

            {/* Confirm Delete Modal */}
            {confirmDelete.open && (
                <dialog className="modal" open>
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Hapus Peserta?</h3>
                        <p className="py-2">Peserta ini akan dihapus dari batch.</p>
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
            )}
        </div>
    );
}
