import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    fetchEmployeeBatchesPaged,
    fetchEmployeeBatches, // untuk build opsi filter lengkap
    updateEmployeeBatchStatus,
    deleteEmployeeFromBatch,
    retryEmployeeBatch,
} from "../../services/employeeBatchService";
import { fetchBatchById, sendBatchNotifications } from "../../services/batchService";
import AddEmployeeBatchModal from "../../components/batches/AddEmployeeBatchModal";
import EditBatchModal from "../../components/batches/EditBatchModal";
import Pagination from "../../components/common/Pagination";
import { ArrowLeft, Plus, Send, RotateCcw, Pencil } from "lucide-react";
import Select from "react-select";

export default function DetailBatchPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [batch, setBatch] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [allParticipants, setAllParticipants] = useState([]); // sumber opsi filter
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

    // filters (table)
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

    // badge jenis
    function renderTypeBadge(type) {
        if (!type) return "-";
        const map = {
            CERTIFICATION: { label: "Sertifikasi", cls: "badge-info" },
            TRAINING: { label: "Training", cls: "badge-primary" },
            REFRESHMENT: { label: "Refreshment", cls: "badge-secondary" },
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
                    search: filterEmployee?.value ?? null, // NIP / nama (BE handle both)
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

    // load SEMUA peserta utk build opsi filter (sekali saat batch id berubah)
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

    // Kirim email
    async function doSendEmails() {
        try {
            if (!batch) return;
            setSendingEmails(true);
            const sent = await sendBatchNotifications(batch.id, {
                status: filterStatus?.value, // optional
            });
            toast.success(`Email terkirim ke ${sent} peserta`);
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Gagal mengirim email");
        } finally {
            setSendingEmails(false);
            setConfirmSend(false);
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
        <div className="space-y-6">
            {/* Header Row: Back (kiri) — Edit (kanan) */}
            <div className="flex items-center justify-between gap-2">
                <button className="btn btn-sm btn-accent flex items-center gap-1" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </button>

                <button
                    className="btn btn-secondary btn-sm flex items-center gap-1 disabled:opacity-60"
                    onClick={() => setOpenEdit(true)}
                    disabled={!batch}
                    title="Edit detail batch"
                >
                    <Pencil className="w-4 h-4" />
                    Edit Batch
                </button>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold">Detail Batch</h2>

            {/* Batch Info */}
            {batch && (
                <div className="card bg-base-100 shadow border border-gray-200">
                    <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 text-sm">
                        <div>
                            <span className="font-bold">Nama Batch:</span>
                            <div>{batch.batchName}</div>
                        </div>

                        {/* JENIS BATCH (baru) */}
                        <div>
                            <span className="font-bold">Jenis Batch:</span>
                            <div>{renderTypeBadge(batch.type)}</div>
                        </div>

                        <div>
                            <span className="font-bold">Sertifikasi:</span>
                            <div>
                                {[
                                    batch.certificationCode,
                                    batch.certificationLevelName,
                                    batch.subFieldCode ?? batch.subBidangCode,
                                ]
                                    .filter((x) => x && String(x).trim() !== "")
                                    .join(" - ") || "-"}
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

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 items-center">
                {/* Tambah Peserta */}
                <div className="col-span-1">
                    <button
                        className="btn btn-primary btn-sm w-full flex items-center gap-1"
                        onClick={() => setOpenAdd(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Peserta
                    </button>
                </div>

                {/* Kirim Email */}
                <div className="col-span-1">
                    <button
                        className="btn btn-success btn-sm w-full flex items-center gap-1 disabled:opacity-60"
                        onClick={() => setConfirmSend(true)}
                        disabled={sendingEmails || !batch}
                    >
                        <Send className="w-4 h-4" />
                        Kirim Email ke Peserta
                    </button>
                </div>

                {/* Clear Filter di paling kanan */}
                <div className="col-span-1 xl:col-start-6">
                    <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
                        Clear Filter
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 text-xs items-end">
                <Select
                    options={employeeOptions}
                    value={filterEmployee}
                    onChange={(opt) => {
                        setFilterEmployee(opt);
                        setPage(1);
                    }}
                    placeholder="Filter Nama/NIP"
                    isClearable
                />
                <Select
                    options={statusOptions}
                    value={filterStatus}
                    onChange={(opt) => {
                        setFilterStatus(opt);
                        setPage(1);
                    }}
                    placeholder="Filter Status"
                    isClearable
                />
                <Select
                    options={regionalOptions}
                    value={filterRegional}
                    onChange={(opt) => {
                        setFilterRegional(opt);
                        setPage(1);
                    }}
                    placeholder="Filter Regional"
                    isClearable
                />
                <Select
                    options={divisionOptions}
                    value={filterDivision}
                    onChange={(opt) => {
                        setFilterDivision(opt);
                        setPage(1);
                    }}
                    placeholder="Filter Division"
                    isClearable
                />
                <Select
                    options={unitOptions}
                    value={filterUnit}
                    onChange={(opt) => {
                        setFilterUnit(opt);
                        setPage(1);
                    }}
                    placeholder="Filter Unit"
                    isClearable
                />
                <Select
                    options={jobOptions}
                    value={filterJob}
                    onChange={(opt) => {
                        setFilterJob(opt);
                        setPage(1);
                    }}
                    placeholder="Filter Job Position"
                    isClearable
                />
            </div>

            {/* Participants Table */}
            <div className="card bg-base-100 shadow border border-gray-200">
                <div className="card-body p-0 overflow-x-auto">
                    <table className="table table-zebra text-sm">
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
                                    <td colSpan={TABLE_COLSPAN} className="text-center py-10">
                                        <span className="loading loading-dots loading-md" />
                                    </td>
                                </tr>
                            ) : participants.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLSPAN} className="text-center text-gray-400 py-10">
                                        Tidak ada peserta
                                    </td>
                                </tr>
                            ) : (
                                participants.map((p, idx) => (
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
                                            {/* REGISTERED: Attend + Hapus */}
                                            {p.status === "REGISTERED" && (
                                                <>
                                                    <button
                                                        className={`btn btn-xs btn-warning btn-soft border-warning ${
                                                            pendingRowId === p.id ? "btn-disabled" : ""
                                                        }`}
                                                        onClick={() => handleUpdateStatus(p.id, "ATTENDED")}
                                                        disabled={pendingRowId === p.id}
                                                    >
                                                        {pendingRowId === p.id ? (
                                                            <span className="loading loading-spinner loading-xs" />
                                                        ) : null}
                                                        Attend
                                                    </button>
                                                    <button
                                                        className={`btn btn-xs btn-neutral btn-soft border-neutral ${
                                                            pendingRowId === p.id ? "btn-disabled" : ""
                                                        }`}
                                                        onClick={() => setConfirmDelete({ open: true, id: p.id })}
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
                                                            pendingRowId === p.id ? "btn-disabled" : ""
                                                        }`}
                                                        onClick={() => handleUpdateStatus(p.id, "PASSED")}
                                                        disabled={pendingRowId === p.id}
                                                    >
                                                        {pendingRowId === p.id ? (
                                                            <span className="loading loading-spinner loading-xs" />
                                                        ) : null}
                                                        Passed
                                                    </button>
                                                    <button
                                                        className={`btn btn-xs btn-error btn-soft border-error ${
                                                            pendingRowId === p.id ? "btn-disabled" : ""
                                                        }`}
                                                        onClick={() => handleUpdateStatus(p.id, "FAILED")}
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
                                                <span className="text-xs text-gray-400 italic">Final</span>
                                            )}
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

            {/* Modal Edit Batch */}
            <EditBatchModal open={openEdit} data={batch} onClose={() => setOpenEdit(false)} onSaved={loadData} />

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

            {/* Confirm Send Emails Modal */}
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
                            <button className="btn" onClick={() => setConfirmSend(false)} disabled={sendingEmails}>
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
        </div>
    );
}
