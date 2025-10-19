import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // ✅ Tambahin ini
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import {
    fetchExceptions,
    deleteException,
    toggleException,
    downloadExceptionTemplate,
} from "../../services/employeeExceptionService";
import { fetchAllJobPositions } from "../../services/jobPositionService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { searchEmployees } from "../../services/employeeService";
import CreateExceptionModal from "../../components/exceptions/CreateExceptionModal";
import EditExceptionModal from "../../components/exceptions/EditExceptionModal";
import ImportExceptionModal from "../../components/exceptions/ImportExceptionModal";

export default function EmployeeExceptionPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [jobOptions, setJobOptions] = useState([]);
    const [certOptions, setCertOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subOptions, setSubOptions] = useState([]);

    const [filterEmployee, setFilterEmployee] = useState(null);
    const [filterJob, setFilterJob] = useState([]);
    const [filterCert, setFilterCert] = useState([]);
    const [filterLevel, setFilterLevel] = useState([]);
    const [filterSub, setFilterSub] = useState([]);
    const [filterStatus, setFilterStatus] = useState([]);

    // Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Delete confirm modal state
    const [confirm, setConfirm] = useState({ open: false, id: null });
    const [selectedRow, setSelectedRow] = useState(null);

    // Load data
    async function load() {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                employeeIds: filterEmployee ? [filterEmployee.value] : [],
                jobIds: filterJob.map((f) => f.value),
                certCodes: filterCert.map((f) => f.value),
                levels: filterLevel.map((f) => f.value),
                subCodes: filterSub.map((f) => f.value),
                statuses: filterStatus.map((f) => f.value),
            };

            const res = await fetchExceptions(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("Gagal memuat eligible manual");
        } finally {
            setLoading(false);
        }
    }

    async function onDelete(id) {
        try {
            await deleteException(id);
            toast.success("Eligible manual dihapus");
            load();
        } catch {
            toast.error("Gagal hapus eligible manual");
        }
    }

    async function onToggle(id) {
        try {
            await toggleException(id);
            toast.success("Status diubah");
            load();
        } catch {
            toast.error("Gagal ubah status");
        }
    }

    async function handleDownloadTemplate() {
        try {
            const blob = await downloadExceptionTemplate();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "exception_template.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            toast.error("Gagal download template");
        }
    }

    async function loadFilters() {
        try {
            const [jobs, certs, levels, subs] = await Promise.all([
                fetchAllJobPositions(),
                fetchCertifications(),
                fetchCertificationLevels(),
                fetchSubFields(),
            ]);

            setJobOptions(jobs.map((j) => ({ value: j.id, label: j.name })));
            setCertOptions(certs.map((c) => ({ value: c.code, label: c.code })));
            setLevelOptions(levels.map((l) => ({ value: l.level, label: l.level })));
            setSubOptions(subs.map((s) => ({ value: s.code, label: s.code })));
        } catch (err) {
            console.error("loadFilters error:", err);
            toast.error("Gagal memuat filter");
        }
    }

    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchEmployees({ search: inputValue, page: 0, size: 20 });
            return res.content.map((e) => ({
                value: e.id,
                label: `${e.nip} - ${e.name}`,
            }));
        } catch {
            return [];
        }
    };

    useEffect(() => {
        load();
    }, [page, rowsPerPage, filterEmployee, filterJob, filterCert, filterLevel, filterSub, filterStatus]);

    useEffect(() => {
        setPage(1);
    }, [filterEmployee, filterJob, filterCert, filterLevel, filterSub, filterStatus]);

    useEffect(() => {
        loadFilters();
    }, []);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div>
            <div className="space-y-3 mb-4">
                {/* 🔸 Button Row */}
                <div className="grid grid-cols-6 gap-3">
                    <div className="lg:col-span-2"></div>
                    <div>
                        <button className="btn btn-primary btn-sm w-full" onClick={() => setShowCreateModal(true)}>
                            + Tambah
                        </button>
                    </div>

                    <div>
                        <button className="btn btn-success btn-sm w-full" onClick={() => setShowImportModal(true)}>
                            Import Excel
                        </button>
                    </div>

                    <div>
                        <button className="btn btn-secondary btn-sm w-full" onClick={handleDownloadTemplate}>
                            Download Template
                        </button>
                    </div>

                    <div>
                        <button
                            className="btn btn-accent btn-soft border-accent btn-sm w-full"
                            onClick={() => {
                                setFilterEmployee(null);
                                setFilterJob([]);
                                setFilterCert([]);
                                setFilterLevel([]);
                                setFilterSub([]);
                                setFilterStatus([]);
                                setPage(1);
                                load();
                                toast.success("Filter dibersihkan");
                            }}
                        >
                            Clear Filter
                        </button>
                    </div>
                </div>

                {/* 🔸 Filter Row */}
                <div className="grid grid-cols-6 gap-3 items-end">
                    {/* Pegawai */}
                    <div className="col-span-1">
                        <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={loadEmployees}
                            value={filterEmployee}
                            onChange={setFilterEmployee}
                            placeholder="Cari pegawai..."
                            className="text-xs"
                        />
                    </div>

                    {/* Jabatan */}
                    <div className="col-span-1">
                        <Select
                            isMulti
                            options={jobOptions}
                            value={filterJob}
                            onChange={setFilterJob}
                            placeholder="Pilih jabatan..."
                            className="text-xs"
                        />
                    </div>

                    {/* Sertifikasi */}
                    <div className="col-span-1">
                        <Select
                            isMulti
                            options={certOptions}
                            value={filterCert}
                            onChange={setFilterCert}
                            placeholder="Pilih sertifikasi..."
                            className="text-xs"
                        />
                    </div>

                    {/* Level */}
                    <div className="col-span-1">
                        <Select
                            isMulti
                            options={levelOptions}
                            value={filterLevel}
                            onChange={setFilterLevel}
                            placeholder="Pilih level..."
                            className="text-xs"
                        />
                    </div>

                    {/* Sub Bidang */}
                    <div className="col-span-1">
                        <Select
                            isMulti
                            options={subOptions}
                            value={filterSub}
                            onChange={setFilterSub}
                            placeholder="Pilih sub bidang..."
                            className="text-xs"
                        />
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                        <Select
                            isMulti
                            options={[
                                { value: true, label: "ACTIVE" },
                                { value: false, label: "NONACTIVE" },
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="Pilih status..."
                            className="text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs">
                        <tr>
                            <th>No</th>
                            <th>NIP</th>
                            <th>Nama Pegawai</th>
                            <th>Jabatan</th>
                            <th>Kode Sertifikasi</th>
                            <th>Level</th>
                            <th>Sub Bidang</th>
                            <th>Notes</th>
                            <th>Status</th>
                            <th>Updated At</th>
                            <th>Aksi</th>
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
                            rows.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{startIdx + idx}</td>
                                    <td>{r.nip}</td>

                                    {/* 🔹 Nama Pegawai bisa diklik ke detail */}
                                    <td>
                                        <Link
                                            to={`/employee/${r.employeeId}`}
                                            className="hover:text-secondary underline"
                                        >
                                            {r.employeeName}
                                        </Link>
                                    </td>

                                    <td>{r.jobPositionTitle}</td>
                                    <td>{r.certificationCode}</td>
                                    <td>{r.certificationLevelName || "-"}</td>
                                    <td>{r.subFieldCode || "-"}</td>
                                    <td>{r.notes || "-"}</td>
                                    <td>
                                        {r.isActive ? (
                                            <span className="badge badge-success border-success badge-sm text-slate-50">
                                                ACTIVE
                                            </span>
                                        ) : (
                                            <span className="badge badge-secondary border-secondary badge-sm text-slate-50">
                                                NONACTIVE
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {r.updatedAt
                                            ? new Date(r.updatedAt).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                              })
                                            : "-"}
                                    </td>
                                    <td className="space-x-1">
                                        <button
                                            className={`btn btn-xs ${
                                                r.isActive
                                                    ? "btn-secondary border-secondary btn-soft"
                                                    : "btn-success border-success btn-soft"
                                            }`}
                                            onClick={() => onToggle(r.id)}
                                        >
                                            {r.isActive ? "Nonaktifkan" : "Aktifkan"}
                                        </button>
                                        <button
                                            className="btn btn-xs border-warning btn-soft btn-warning"
                                            onClick={() => {
                                                setSelectedRow(r);
                                                setShowEditModal(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-xs border-error btn-soft btn-error"
                                            onClick={() => setConfirm({ open: true, id: r.id })}
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

            {/* Modal Create */}
            {showCreateModal && (
                <CreateExceptionModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onSaved={load} />
            )}

            {/* Modal Edit */}
            {showEditModal && selectedRow && (
                <EditExceptionModal
                    open={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSaved={load}
                    initial={selectedRow}
                />
            )}

            {/* Modal Import */}
            {showImportModal && (
                <ImportExceptionModal
                    open={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImported={() => {
                        setPage(1);
                        load();
                    }}
                />
            )}

            {/* Modal Delete */}
            {confirm.open && (
                <dialog className="modal" open={confirm.open}>
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Hapus Exception?</h3>
                        <p className="py-2">Exception ini akan dihapus dari sistem.</p>
                        <div className="modal-action">
                            <button className="btn" onClick={() => setConfirm({ open: false, id: null })}>
                                Batal
                            </button>
                            <button
                                className="btn btn-error"
                                onClick={async () => {
                                    await onDelete(confirm.id);
                                    setConfirm({ open: false, id: null });
                                }}
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setConfirm({ open: false, id: null })}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
