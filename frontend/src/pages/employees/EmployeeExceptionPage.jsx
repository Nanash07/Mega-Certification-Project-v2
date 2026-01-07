import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getCurrentRole } from "../../utils/helpers";
import {
    fetchExceptions,
    deleteException,
    toggleException,
    downloadExceptionTemplate,
    exportExceptions,
} from "../../services/employeeExceptionService";
import { fetchAllJobPositions } from "../../services/jobPositionService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { searchEmployees } from "../../services/employeeService";
import { fetchMyPicScope } from "../../services/picScopeService";

import CreateExceptionModal from "../../components/exceptions/CreateExceptionModal";
import EditExceptionModal from "../../components/exceptions/EditExceptionModal";
import ImportExceptionModal from "../../components/exceptions/ImportExceptionModal";
import { Plus, Upload, Download, Eraser, Eye, Pencil, Trash2, ChevronDown } from "lucide-react";

const TABLE_COLS = 11;

export default function EmployeeExceptionPage() {
    const navigate = useNavigate();

    const [role, setRole] = useState(null);
    useEffect(() => {
        setRole(getCurrentRole());
    }, []);

    const isRoleLoaded = role !== null;
    const isPic = role === "PIC";
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

    const [picCertCodes, setPicCertCodes] = useState(null);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

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

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    const [confirm, setConfirm] = useState({ open: false, id: null });
    const [selectedRow, setSelectedRow] = useState(null);

    const [statusMenu, setStatusMenu] = useState(null);

    async function loadFilters() {
        if (!isRoleLoaded || isEmployee) return;

        try {
            const [jobs, certs, levels, subs] = await Promise.all([
                fetchAllJobPositions(),
                fetchCertifications(),
                fetchCertificationLevels(),
                fetchSubFields(),
            ]);

            let effectiveCerts = certs || [];

            if (isPic) {
                try {
                    const scope = await fetchMyPicScope();
                    const scopeCerts = scope?.certifications || [];
                    const codes = new Set(
                        scopeCerts.map((s) => s.certificationCode).filter((code) => code && String(code).trim() !== "")
                    );
                    setPicCertCodes(codes);
                    effectiveCerts = effectiveCerts.filter((c) => codes.has(c.code));
                } catch (e) {
                    console.error("load PIC scope error:", e);
                    toast.error("Gagal memuat scope sertifikasi PIC");
                }
            }

            setJobOptions((jobs || []).map((j) => ({ value: j.id, label: j.name })));
            setCertOptions((effectiveCerts || []).map((c) => ({ value: c.code, label: c.code })));
            setLevelOptions((levels || []).map((l) => ({ value: l.level, label: l.level })));
            setSubOptions((subs || []).map((s) => ({ value: s.code, label: s.code })));
        } catch (err) {
            console.error("loadFilters error:", err);
            toast.error("Gagal memuat filter");
        }
    }

    function buildParamsForQuery() {
        let certCodesFilter = filterCert.map((f) => f.value);

        if (isPic && picCertCodes && picCertCodes.size > 0) {
            if (certCodesFilter.length > 0) {
                certCodesFilter = certCodesFilter.filter((code) => picCertCodes.has(code));
            } else {
                certCodesFilter = Array.from(picCertCodes);
            }
        }

        return {
            employeeIds: filterEmployee ? [filterEmployee.value] : [],
            jobIds: filterJob.map((f) => f.value),
            certCodes: certCodesFilter,
            levels: filterLevel.map((f) => f.value),
            subCodes: filterSub.map((f) => f.value),
            statuses: filterStatus.map((f) => f.value),
        };
    }

    async function load() {
        if (!isRoleLoaded || isEmployee) return;

        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                ...buildParamsForQuery(),
            };

            const res = await fetchExceptions(params);
            let content = res.content || [];

            if (isPic && picCertCodes && picCertCodes.size > 0) {
                content = content.filter((r) => !r.certificationCode || picCertCodes.has(r.certificationCode));
            }

            setRows(content);
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

    async function handleChangeStatus(row, targetActive) {
        if (row.isActive === targetActive) return;

        try {
            await toggleException(row.id);
            toast.success(`Status diubah ke ${targetActive ? "Active" : "Nonactive"}`);
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

    async function handleExportExcel() {
        try {
            const blob = await exportExceptions(buildParamsForQuery());
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `employee-exceptions-${new Date().toISOString().slice(0, 10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            toast.error("Gagal export");
        }
    }

    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchEmployees({ search: inputValue, page: 0, size: 20 });
            return (res.content || []).map((e) => ({ value: e.id, label: `${e.nip} - ${e.name}` }));
        } catch {
            return [];
        }
    };

    useEffect(() => {
        if (!isRoleLoaded) return;
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
    }, [isRoleLoaded, isEmployee]);

    useEffect(() => {
        loadFilters();
    }, [isRoleLoaded, role]);

    useEffect(() => {
        load();
    }, [
        isRoleLoaded,
        role,
        page,
        rowsPerPage,
        filterEmployee,
        filterJob,
        filterCert,
        filterLevel,
        filterSub,
        filterStatus,
        picCertCodes,
    ]);

    useEffect(() => {
        setPage(1);
    }, [filterEmployee, filterJob, filterCert, filterLevel, filterSub, filterStatus]);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    const renderStatusBadge = (row) => {
        const isActive = row.isActive;
        const label = isActive ? "Active" : "Nonactive";
        const cls = isActive ? "badge-success border-success" : "badge-secondary border-secondary";

        return (
            <button
                type="button"
                className={`badge badge-sm whitespace-nowrap cursor-pointer flex items-center gap-1 ${cls} text-white`}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStatusMenu({ row, x: rect.left, y: rect.bottom + 4 });
                }}
            >
                <span>{label}</span>
                <ChevronDown className="w-3 h-3" />
            </button>
        );
    };

    if (!isRoleLoaded || isEmployee) return null;

    return (
        <div>
            <div className="space-y-3 mb-4">
                <div className="grid grid-cols-6 gap-3">
                    <div>
                        <button
                            className="btn btn-primary btn-sm w-full flex items-center gap-1"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Tambah
                        </button>
                    </div>

                    <div>
                        <button
                            className="btn btn-success btn-sm w-full flex items-center gap-1"
                            onClick={() => setShowImportModal(true)}
                        >
                            <Upload className="w-4 h-4" />
                            Import Excel
                        </button>
                    </div>

                    <div>
                        <button
                            className="btn btn-secondary btn-sm w-full flex items-center gap-1"
                            onClick={handleDownloadTemplate}
                        >
                            <Download className="w-4 h-4" />
                            Download Template
                        </button>
                    </div>

                    <div>
                        <button
                            className="btn btn-neutral btn-sm w-full flex items-center gap-1"
                            onClick={handleExportExcel}
                        >
                            <Download className="w-4 h-4" />
                            Export Data
                        </button>
                    </div>

                    <div className="lg:col-span-1" />

                    <div>
                        <button
                            className="btn btn-accent btn-soft border-accent btn-sm w-full flex items-center gap-1"
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
                            <Eraser className="w-4 h-4" />
                            Clear Filter
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-6 gap-3 items-end text-xs">
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

                    <div className="col-span-1">
                        <Select
                            isMulti
                            options={[
                                { value: true, label: "Active" },
                                { value: false, label: "Nonactive" },
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="Pilih status..."
                            className="text-xs"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>NIP</th>
                            <th>Nama Pegawai</th>
                            <th>Jabatan</th>
                            <th>Kode Sertifikasi</th>
                            <th>Level</th>
                            <th>Sub Bidang</th>
                            <th>Notes</th>
                            <th>Status</th>
                            <th>Updated At</th>
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
                            rows.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{startIdx + idx}</td>
                                    <td>
                                        <div className="flex gap-1">
                                            <div className="tooltip" data-tip="Lihat detail pegawai">
                                                <Link
                                                    to={`/employee/${r.employeeId}`}
                                                    className="btn btn-xs btn-info btn-soft border-info"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Link>
                                            </div>

                                            <div className="tooltip" data-tip="Edit eligibility manual">
                                                <button
                                                    className="btn btn-xs btn-warning btn-soft border-warning"
                                                    onClick={() => {
                                                        setSelectedRow(r);
                                                        setShowEditModal(true);
                                                    }}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </div>

                                            <div className="tooltip" data-tip="Hapus eligibility manual">
                                                <button
                                                    className="btn btn-xs btn-error btn-soft border-error"
                                                    onClick={() => setConfirm({ open: true, id: r.id })}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{r.nip}</td>
                                    <td>{r.employeeName}</td>
                                    <td>{r.jobPositionTitle}</td>
                                    <td>{r.certificationCode}</td>
                                    <td>{r.certificationLevelName || "-"}</td>
                                    <td>{r.subFieldCode || "-"}</td>
                                    <td>{r.notes || "-"}</td>
                                    <td>{renderStatusBadge(r)}</td>
                                    <td className="whitespace-nowrap">
                                        {r.updatedAt
                                            ? new Date(r.updatedAt).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "-"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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

            {showCreateModal && (
                <CreateExceptionModal
                    open={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSaved={load}
                    picCertCodes={isPic ? picCertCodes : null}
                />
            )}

            {showEditModal && selectedRow && (
                <EditExceptionModal
                    open={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSaved={load}
                    initial={selectedRow}
                    picCertCodes={isPic ? picCertCodes : null}
                />
            )}

            {showImportModal && (
                <ImportExceptionModal
                    open={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImported={() => {
                        setPage(1);
                        load();
                    }}
                    picCertCodes={isPic ? picCertCodes : null}
                />
            )}

            <ConfirmDialog
                open={confirm.open}
                title="Hapus Exception?"
                message="Exception ini akan dihapus dari sistem."
                onConfirm={async () => {
                    await onDelete(confirm.id);
                    setConfirm({ open: false, id: null });
                }}
                onCancel={() => setConfirm({ open: false, id: null })}
            />

            {statusMenu && (
                <div className="fixed inset-0 z-[999] flex" onClick={() => setStatusMenu(null)}>
                    <div
                        className="absolute"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-2xl p-3 text-xs flex flex-col gap-2">
                            <button
                                className="w-full px-4 py-1 rounded-full bg-success text-white hover:brightness-95"
                                onClick={async () => {
                                    await handleChangeStatus(statusMenu.row, true);
                                    setStatusMenu(null);
                                }}
                            >
                                Active
                            </button>
                            <button
                                className="w-full px-4 py-1 rounded-full bg-secondary text-white hover:brightness-95"
                                onClick={async () => {
                                    await handleChangeStatus(statusMenu.row, false);
                                    setStatusMenu(null);
                                }}
                            >
                                Nonactive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
