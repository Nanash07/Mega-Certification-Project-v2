import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    fetchEmployeeBatchesPaged,
    fetchEmployeeBatches,
    updateEmployeeBatchStatus,
    deleteEmployeeFromBatch,
    retryEmployeeBatch,
} from "../../services/employeeBatchService";
import { fetchBatchById, sendBatchNotifications, exportBatchParticipants } from "../../services/batchService";
import AddEmployeeBatchModal from "../../components/batches/AddEmployeeBatchModal";
import EditBatchModal from "../../components/batches/EditBatchModal";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getCurrentRole } from "../../utils/helpers";
import { ArrowLeft, Plus, Send, RotateCcw, Pencil, Users, Eraser, Filter, Download } from "lucide-react";
import Select from "react-select";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

export default function DetailBatchPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // ===== AUTH / LIMITATION =====
    const storedUser = getStoredUser();
    const role = getCurrentRole();
    const isEmployee = role === "PEGAWAI";
    const canManageBatch = !isEmployee; // PIC + SUPERADMIN (dan non pegawai lainnya)

    const currentEmployeeId = storedUser.employeeId ?? null;

    // IMPORTANT: participant row harus punya employeeId
    const isOwnRow = (p) => {
        if (!currentEmployeeId) return false;
        if (!p?.employeeId) return false;
        return Number(p.employeeId) === Number(currentEmployeeId);
    };

    const [batch, setBatch] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [allParticipants, setAllParticipants] = useState([]);
    const [loading, setLoading] = useState(false);

    // pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
    const [confirmSend, setConfirmSend] = useState(false);

    // filters
    const [filterEmployee, setFilterEmployee] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterRegional, setFilterRegional] = useState(null);
    const [filterDivision, setFilterDivision] = useState(null);
    const [filterUnit, setFilterUnit] = useState(null);
    const [filterJob, setFilterJob] = useState(null);

    // kirim email
    const [sendingEmails, setSendingEmails] = useState(false);

    // disable action per row waktu request
    const [pendingRowId, setPendingRowId] = useState(null);

    const statusOptions = [
        { value: "REGISTERED", label: "Registered" },
        { value: "ATTENDED", label: "Attended" },
        { value: "PASSED", label: "Passed" },
        { value: "FAILED", label: "Failed" },
    ];

    function renderTypeBadge(type) {
        if (!type) return "-";
        const map = {
            CERTIFICATION: { label: "Sertifikasi", cls: "badge-info text-white" },
            TRAINING: { label: "Training", cls: "badge-primary text-white" },
            REFRESHMENT: { label: "Refreshment", cls: "badge-secondary text-white" },
            EXTENSION: { label: "Perpanjang", cls: "badge-success text-white" },
        };
        const m = map[type] || { label: type, cls: "badge-neutral" };
        return <span className={`badge badge-sm ${m.cls}`}>{m.label}</span>;
    }

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
                    search: filterEmployee?.value ?? null,
                    status: filterStatus?.value ?? null,
                    regional: filterRegional?.value ?? null,
                    division: filterDivision?.value ?? null,
                    unit: filterUnit?.value ?? null,
                    job: filterJob?.value ?? null,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, page, rowsPerPage, filterEmployee, filterStatus, filterRegional, filterDivision, filterUnit, filterJob]);

    // load semua peserta utk filter options
    useEffect(() => {
        async function loadAll() {
            try {
                const arr = await fetchEmployeeBatches(id);
                setAllParticipants(arr || []);
            } catch {
                // no-op
            }
        }
        if (id) loadAll();
    }, [id]);

    // ================== HANDLERS ==================
    async function handleUpdateStatus(pid, status) {
        setPendingRowId(pid);
        try {
            const updated = await updateEmployeeBatchStatus(pid, status);
            toast.success("Status peserta diperbarui");
            setParticipants((prev) => prev.map((p) => (p.id === pid ? { ...p, ...updated } : p)));
        } catch (e) {
            toast.error(e?.response?.data?.message || "Gagal update status");
        } finally {
            setPendingRowId(null);
        }
    }

    async function handleDelete(pid) {
        try {
            await deleteEmployeeFromBatch(pid);
            toast.success("Peserta dihapus");
            loadData();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Gagal hapus peserta");
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    }

    async function handleRetry(pid) {
        setPendingRowId(pid);
        try {
            const updated = await retryEmployeeBatch(pid);
            toast.success("Peserta di-set ulang ke REGISTERED");
            setParticipants((prev) => prev.map((p) => (p.id === pid ? { ...p, ...updated } : p)));
        } catch (e) {
            toast.error(e?.response?.data?.message || "Gagal set ulang peserta");
        } finally {
            setPendingRowId(null);
        }
    }

    async function doSendEmails() {
        try {
            if (!batch) return;
            setSendingEmails(true);
            const sent = await sendBatchNotifications(batch.id, { status: filterStatus?.value });
            toast.success(`Email terkirim ke ${sent} peserta`);
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Gagal mengirim email");
        } finally {
            setSendingEmails(false);
            setConfirmSend(false);
        }
    }

    async function handleExport() {
        try {
            await exportBatchParticipants(id, batch?.batchName);
            toast.success("Export berhasil didownload");
        } catch (e) {
            console.error(e);
            toast.error("Gagal export data");
        }
    }

    // ================== FILTER OPTIONS ==================
    const employeeOptions = useMemo(
        () =>
            (allParticipants.length ? allParticipants : participants).map((p) => ({
                value: p.employeeNip,
                label: `${p.employeeNip} - ${p.employeeName}${p.employeeJobName ? ` (${p.employeeJobName})` : ""}`,
            })),
        [allParticipants, participants]
    );

    const buildOptions = (arr) =>
        Array.from(new Set(arr.filter(Boolean)))
            .sort()
            .map((name) => ({ value: name, label: name }));

    const regionalOptions = useMemo(
        () => buildOptions(allParticipants.map((p) => p.employeeRegionalName)),
        [allParticipants]
    );
    const divisionOptions = useMemo(
        () => buildOptions(allParticipants.map((p) => p.employeeDivisionName)),
        [allParticipants]
    );
    const unitOptions = useMemo(() => buildOptions(allParticipants.map((p) => p.employeeUnitName)), [allParticipants]);
    const jobOptions = useMemo(() => buildOptions(allParticipants.map((p) => p.employeeJobName)), [allParticipants]);

    function resetFilter() {
        setFilterEmployee(null);
        setFilterStatus(null);
        setFilterRegional(null);
        setFilterDivision(null);
        setFilterUnit(null);
        setFilterJob(null);
        setPage(1);
        toast.success("Filter direset");
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;
    const TABLE_COLSPAN = 9;

    // ================== RENDER ==================
    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold">Detail Batch</h1>
                        <p className="text-xs text-gray-500">{totalElements} peserta terdaftar</p>
                    </div>
                </div>
                    <div className="flex flex-wrap gap-2">
                        {canManageBatch && (
                            <>
                                <button
                                    className="btn btn-sm btn-neutral rounded-lg"
                                    onClick={handleExport}
                                >
                                    <Download size={14} />
                                    Export Excel
                                </button>
                                <button
                                    className="btn btn-sm btn-primary rounded-lg"
                                    onClick={() => setOpenAdd(true)}
                                >
                                    <Plus size={14} />
                                    Tambah Peserta
                                </button>
                                <button
                                    className="btn btn-sm btn-success rounded-lg"
                                    onClick={() => setConfirmSend(true)}
                                    disabled={sendingEmails || !batch}
                                >
                                    <Send size={14} />
                                    Kirim Email
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary rounded-lg"
                                    onClick={() => setOpenEdit(true)}
                                    disabled={!batch}
                                >
                                    <Pencil size={14} />
                                    Edit Batch
                                </button>
                            </>
                        )}
                    </div>
            </div>

            {/* Batch Info Card */}
            {batch && (
                <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                        <div>
                            <span className="font-medium text-gray-500">Nama Batch</span>
                            <div className="font-semibold">{batch.batchName}</div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Jenis</span>
                            <div>{renderTypeBadge(batch.type)}</div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Sertifikasi</span>
                            <div className="font-semibold">
                                {[
                                    batch.certificationCode,
                                    batch.certificationLevelLevel ? `Jenjang ${batch.certificationLevelLevel}` : null,
                                    batch.subFieldCode ?? batch.subBidangCode
                                ].filter(Boolean).join(" - ") || "-"}
                            </div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Lembaga</span>
                            <div>{batch.institutionName || "-"}</div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Status</span>
                            <div>
                                <span
                                    className={`badge badge-sm text-white ${
                                        batch.status === "PLANNED" ? "badge-warning"
                                            : batch.status === "ONGOING" ? "badge-info"
                                            : batch.status === "FINISHED" ? "badge-success"
                                            : "badge-error"
                                    }`}
                                >
                                    {batch.status === "ONGOING" ? "Ongoing"
                                        : batch.status === "PLANNED" ? "Planned"
                                        : batch.status === "FINISHED" ? "Finished"
                                        : batch.status === "CANCELLED" ? "Cancelled"
                                        : batch.status}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Tanggal Mulai</span>
                            <div>{batch.startDate ? new Date(batch.startDate).toLocaleDateString("id-ID") : "-"}</div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Tanggal Selesai</span>
                            <div>{batch.endDate ? new Date(batch.endDate).toLocaleDateString("id-ID") : "-"}</div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Quota</span>
                            <div>{batch.quota ?? "-"}</div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Total Peserta</span>
                            <div className="font-semibold">{batch.totalParticipants ?? 0}</div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Total Lulus</span>
                            <div className="font-semibold text-success">{batch.totalPassed ?? 0}</div>
                        </div>
                        <div>
                            <span className="font-medium text-gray-500">Total Gagal</span>
                            <div className="font-semibold text-error">{batch.totalFailed ?? 0}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Nama/NIP
                        </label>
                        <Select
                            options={employeeOptions}
                            value={filterEmployee}
                            onChange={(opt) => { setFilterEmployee(opt); setPage(1); }}
                            placeholder="Filter Nama/NIP"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Status
                        </label>
                        <Select
                            options={statusOptions}
                            value={filterStatus}
                            onChange={(opt) => { setFilterStatus(opt); setPage(1); }}
                            placeholder="Filter Status"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Regional
                        </label>
                        <Select
                            options={regionalOptions}
                            value={filterRegional}
                            onChange={(opt) => { setFilterRegional(opt); setPage(1); }}
                            placeholder="Filter Regional"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Division
                        </label>
                        <Select
                            options={divisionOptions}
                            value={filterDivision}
                            onChange={(opt) => { setFilterDivision(opt); setPage(1); }}
                            placeholder="Filter Division"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Unit
                        </label>
                        <Select
                            options={unitOptions}
                            value={filterUnit}
                            onChange={(opt) => { setFilterUnit(opt); setPage(1); }}
                            placeholder="Filter Unit"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Jabatan
                        </label>
                        <Select
                            options={jobOptions}
                            value={filterJob}
                            onChange={(opt) => { setFilterJob(opt); setPage(1); }}
                            placeholder="Filter Jabatan"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-3">
                    <button
                        className="btn btn-sm btn-accent btn-soft rounded-lg flex gap-2"
                        onClick={resetFilter}
                    >
                        <Eraser size={14} />
                        Clear Filter
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra text-xs w-full">
                        <thead className="bg-base-200">
                            <tr>
                                <th>No</th>
                                <th>NIP</th>
                                <th>Nama</th>
                                <th>Regional</th>
                                <th>Divisi</th>
                                <th>Unit</th>
                                <th>Jabatan</th>
                                <th>Status</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={TABLE_COLSPAN} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : participants.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLSPAN} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Users size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada peserta terdaftar</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                participants.map((p, idx) => {
                                    const own = isOwnRow(p);

                                    // RULE:
                                    // - PIC/SUPERADMIN: full actions
                                    // - PEGAWAI: only Attend (REGISTERED) and only for own row
                                    const canEmployeeAttend = isEmployee && own && p.status === "REGISTERED";
                                    const showAnyAction = canManageBatch || canEmployeeAttend;

                                    return (
                                        <tr key={p.id}>
                                            <td>{startIdx + idx}</td>
                                            <td>{p.employeeNip}</td>
                                            <td>{p.employeeName}</td>
                                            <td>{p.employeeRegionalName ?? "-"}</td>
                                            <td>{p.employeeDivisionName ?? "-"}</td>
                                            <td>{p.employeeUnitName ?? "-"}</td>
                                            <td>{p.employeeJobName ?? "-"}</td>
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
                                                {!showAnyAction ? (
                                                    <span className="text-xs text-gray-400 italic">-</span>
                                                ) : (
                                                    <>
                                                        {/* ====== PEGAWAI: ONLY ATTEND ====== */}
                                                        {canEmployeeAttend && !canManageBatch && (
                                                            <button
                                                                className={`btn btn-xs btn-warning btn-soft border-warning ${
                                                                    pendingRowId === p.id ? "btn-disabled" : ""
                                                                }`}
                                                                onClick={() => handleUpdateStatus(p.id, "ATTENDED")}
                                                                disabled={pendingRowId === p.id}
                                                                title="Hanya bisa Attend untuk peserta sendiri"
                                                            >
                                                                {pendingRowId === p.id ? (
                                                                    <span className="loading loading-spinner loading-xs" />
                                                                ) : null}
                                                                Attend
                                                            </button>
                                                        )}

                                                        {/* ====== PIC/SUPERADMIN: FULL ACTIONS ====== */}
                                                        {canManageBatch && (
                                                            <>
                                                                {/* REGISTERED: Attend + Hapus */}
                                                                {p.status === "REGISTERED" && (
                                                                    <>
                                                                        <button
                                                                            className={`btn btn-xs btn-warning btn-soft border-warning ${
                                                                                pendingRowId === p.id
                                                                                    ? "btn-disabled"
                                                                                    : ""
                                                                            }`}
                                                                            onClick={() =>
                                                                                handleUpdateStatus(p.id, "ATTENDED")
                                                                            }
                                                                            disabled={pendingRowId === p.id}
                                                                        >
                                                                            {pendingRowId === p.id ? (
                                                                                <span className="loading loading-spinner loading-xs" />
                                                                            ) : null}
                                                                            Attend
                                                                        </button>
                                                                        <button
                                                                            className={`btn btn-xs btn-error btn-soft border-error ${
                                                                                pendingRowId === p.id
                                                                                    ? "btn-disabled"
                                                                                    : ""
                                                                            }`}
                                                                            onClick={() =>
                                                                                setConfirmDelete({
                                                                                    open: true,
                                                                                    id: p.id,
                                                                                })
                                                                            }
                                                                            disabled={pendingRowId === p.id}
                                                                        >
                                                                            Hapus
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {/* ATTENDED: Passed/Failed */}
                                                                {p.status === "ATTENDED" && (
                                                                    <>
                                                                        <button
                                                                            className={`btn btn-xs btn-success btn-soft border-success ${
                                                                                pendingRowId === p.id
                                                                                    ? "btn-disabled"
                                                                                    : ""
                                                                            }`}
                                                                            onClick={() =>
                                                                                handleUpdateStatus(p.id, "PASSED")
                                                                            }
                                                                            disabled={pendingRowId === p.id}
                                                                        >
                                                                            {pendingRowId === p.id ? (
                                                                                <span className="loading loading-spinner loading-xs" />
                                                                            ) : null}
                                                                            Passed
                                                                        </button>
                                                                        <button
                                                                            className={`btn btn-xs btn-error btn-soft border-error ${
                                                                                pendingRowId === p.id
                                                                                    ? "btn-disabled"
                                                                                    : ""
                                                                            }`}
                                                                            onClick={() =>
                                                                                handleUpdateStatus(p.id, "FAILED")
                                                                            }
                                                                            disabled={pendingRowId === p.id}
                                                                        >
                                                                            {pendingRowId === p.id ? (
                                                                                <span className="loading loading-spinner loading-xs" />
                                                                            ) : null}
                                                                            Failed
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {/* FAILED: Ulangi */}
                                                                {p.status === "FAILED" && (
                                                                    <button
                                                                        className={`btn btn-xs btn-info btn-soft border-info flex items-center gap-1 ${
                                                                            pendingRowId === p.id ? "btn-disabled" : ""
                                                                        }`}
                                                                        onClick={() => handleRetry(p.id)}
                                                                        title="Ulang attempt (balik ke REGISTERED)"
                                                                        disabled={pendingRowId === p.id}
                                                                    >
                                                                        {pendingRowId === p.id ? (
                                                                            <span className="loading loading-spinner loading-xs" />
                                                                        ) : (
                                                                            <RotateCcw className="w-3 h-3" />
                                                                        )}
                                                                        Ulang
                                                                    </button>
                                                                )}

                                                                {/* PASSED: read-only */}
                                                                {p.status === "PASSED" && (
                                                                    <span className="text-xs text-gray-400 italic">
                                                                        Final
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination inside card */}
                {participants.length > 0 && (
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

            {/* Modals: only PIC/SUPERADMIN */}
            {canManageBatch && (
                <>
                    <AddEmployeeBatchModal
                        open={openAdd}
                        batchId={id}
                        onClose={() => setOpenAdd(false)}
                        onSaved={loadData}
                    />
                    <EditBatchModal
                        open={openEdit}
                        data={batch}
                        onClose={() => setOpenEdit(false)}
                        onSaved={loadData}
                    />

                    <ConfirmDialog
                        open={confirmDelete.open}
                        title="Hapus Peserta?"
                        message="Peserta ini akan dihapus dari batch."
                        onConfirm={() => handleDelete(confirmDelete.id)}
                        onCancel={() => setConfirmDelete({ open: false, id: null })}
                    />

                    {/* Confirm Send Emails */}
                    {confirmSend && (
                        <dialog className="modal" open>
                            <div className="modal-box">
                                <h3 className="font-bold text-lg">Kirim Email ke Peserta?</h3>
                                <p className="py-2">
                                    Sistem akan mengirim email ke <b>semua peserta</b> pada batch ini
                                    {filterStatus?.value ? (
                                        <>
                                            {" "}
                                            dengan status <b>{filterStatus.value}</b>
                                        </>
                                    ) : null}
                                    .
                                    {typeof totalElements === "number" && totalElements > 0 ? (
                                        <>
                                            {" "}
                                            Total peserta: <b>{totalElements}</b>.
                                        </>
                                    ) : null}
                                </p>
                                <div className="modal-action">
                                    <button
                                        className="btn"
                                        onClick={() => setConfirmSend(false)}
                                        disabled={sendingEmails}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        className={`btn btn-info ${sendingEmails ? "btn-disabled" : ""}`}
                                        onClick={doSendEmails}
                                    >
                                        {sendingEmails ? (
                                            <span className="loading loading-spinner loading-sm" />
                                        ) : (
                                            <Send className="w-4 h-4 mr-1" />
                                        )}
                                        {sendingEmails ? "Mengirim..." : "Kirim Sekarang"}
                                    </button>
                                </div>
                            </div>
                            <form method="dialog" className="modal-backdrop">
                                <button onClick={() => !sendingEmails && setConfirmSend(false)}>close</button>
                            </form>
                        </dialog>
                    )}
                </>
            )}
        </div>
    );
}
