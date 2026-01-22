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
import { Plus, Upload, Download, Eraser, Eye, Pencil, Trash2, ChevronDown, UserCog, Search, Briefcase, Award, Layers, Grid3X3, Filter } from "lucide-react";

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
    const [filterJob, setFilterJob] = useState(null);
    const [filterCert, setFilterCert] = useState(null);
    const [filterLevel, setFilterLevel] = useState(null);
    const [filterSub, setFilterSub] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);

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
        let certCodesFilter = filterCert ? [filterCert.value] : [];

        if (isPic && picCertCodes && picCertCodes.size > 0) {
            if (certCodesFilter.length > 0) {
                certCodesFilter = certCodesFilter.filter((code) => picCertCodes.has(code));
            } else {
                certCodesFilter = Array.from(picCertCodes);
            }
        }

        return {
            employeeIds: filterEmployee ? [filterEmployee.value] : [],
            jobIds: filterJob ? [filterJob.value] : [],
            certCodes: certCodesFilter,
            levels: filterLevel ? [filterLevel.value] : [],
            subCodes: filterSub ? [filterSub.value] : [],
            statuses: filterStatus ? [filterStatus.value] : [],
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

    const clearFilter = () => {
        setFilterEmployee(null);
        setFilterJob(null);
        setFilterCert(null);
        setFilterLevel(null);
        setFilterSub(null);
        setFilterStatus(null);
        setPage(1);
        load();
        toast.success("Filter dibersihkan");
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
        const cls = isActive ? "badge-success" : "badge-secondary";

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
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Eligibility Manual</h1>
                    <p className="text-xs text-gray-500">{totalElements} data eligibility manual</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="btn btn-sm btn-primary rounded-lg"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={14} />
                        Tambah
                    </button>
                    <button
                        className="btn btn-sm btn-success rounded-lg"
                        onClick={() => setShowImportModal(true)}
                    >
                        <Upload size={14} />
                        Import Excel
                    </button>
                    <button
                        className="btn btn-sm btn-secondary rounded-lg"
                        onClick={handleDownloadTemplate}
                    >
                        <Download size={14} />
                        Template
                    </button>
                    <button
                        className="btn btn-sm btn-neutral rounded-lg"
                        onClick={handleExportExcel}
                    >
                        <Download size={14} />
                        Export
                    </button>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Search size={12} /> Cari Pegawai
                        </label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={loadEmployees}
                            value={filterEmployee}
                            onChange={setFilterEmployee}
                            placeholder="Ketik NIP/nama..."
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Briefcase size={12} /> Jabatan
                        </label>
                        <Select
                            options={jobOptions}
                            value={filterJob}
                            onChange={setFilterJob}
                            isClearable
                            placeholder="Semua Jabatan"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Award size={12} /> Sertifikasi
                        </label>
                        <Select
                            options={certOptions}
                            value={filterCert}
                            onChange={setFilterCert}
                            isClearable
                            placeholder="Semua Sertifikasi"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Layers size={12} /> Level
                        </label>
                        <Select
                            options={levelOptions}
                            value={filterLevel}
                            onChange={setFilterLevel}
                            isClearable
                            placeholder="Semua Level"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Grid3X3 size={12} /> Sub Bidang
                        </label>
                        <Select
                            options={subOptions}
                            value={filterSub}
                            onChange={setFilterSub}
                            isClearable
                            placeholder="Semua Sub Bidang"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Status
                        </label>
                        <Select
                            options={[
                                { value: true, label: "Active" },
                                { value: false, label: "Nonactive" },
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            isClearable
                            placeholder="Semua Status"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-3">
                    <button
                        className="btn btn-sm btn-accent btn-soft flex gap-2 rounded-lg"
                        type="button"
                        onClick={clearFilter}
                    >
                        <Eraser size={14} />
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
                                <th className="w-24">Aksi</th>
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
                                    <td colSpan={TABLE_COLS} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLS} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <UserCog size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data eligibility manual</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <div className="tooltip" data-tip="Lihat detail pegawai">
                                                    <Link
                                                        to={`/employee/${r.employeeId}`}
                                                        className="btn btn-xs btn-info btn-soft border border-info rounded-lg"
                                                    >
                                                        <Eye size={12} />
                                                    </Link>
                                                </div>

                                                <div className="tooltip" data-tip="Edit eligibility manual">
                                                    <button
                                                        className="btn btn-xs btn-warning btn-soft border border-warning rounded-lg"
                                                        onClick={() => {
                                                            setSelectedRow(r);
                                                            setShowEditModal(true);
                                                        }}
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>

                                                <div className="tooltip" data-tip="Hapus eligibility manual">
                                                    <button
                                                        className="btn btn-xs btn-error btn-soft border border-error rounded-lg"
                                                        onClick={() => setConfirm({ open: true, id: r.id })}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{r.nip}</td>
                                        <td className="font-medium">{r.employeeName}</td>
                                        <td>{r.jobPositionTitle}</td>
                                        <td>{r.certificationCode}</td>
                                        <td>{r.certificationLevelLevel ? `Jenjang ${r.certificationLevelLevel}` : "-"}</td>
                                        <td>{r.subFieldCode || "-"}</td>
                                        <td>{r.notes || "-"}</td>
                                        <td>{renderStatusBadge(r)}</td>
                                        <td className="text-gray-500 whitespace-nowrap">
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
                <div className="fixed inset-0 z-[999]" onClick={() => setStatusMenu(null)}>
                    <div
                        className="absolute"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-xl border border-gray-200 p-2 text-xs flex flex-col gap-1.5">
                            {[true, false].map((val) => {
                                const label = val ? "Active" : "Nonactive";
                                const btnCls = val ? "btn-success" : "btn-secondary";
                                return (
                                    <button
                                        key={String(val)}
                                        className={`btn btn-xs ${btnCls} text-white rounded-lg w-full justify-center`}
                                        onClick={async () => {
                                            await handleChangeStatus(statusMenu.row, val);
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

