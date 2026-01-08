// src/pages/employees/EmployeeCertificationPage.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { Plus, History as HistoryIcon, Eraser, Pencil, Trash2, Upload, Eye, Download, Filter, Award } from "lucide-react";

import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getCurrentRole, formatDate, formatDateTime } from "../../utils/helpers";

import {
    fetchCertifications,
    deleteCertification,
    exportCertifications,
} from "../../services/employeeCertificationService";
import { searchEmployees } from "../../services/employeeService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchInstitutions } from "../../services/institutionService";
import { fetchMyPicScope } from "../../services/picScopeService";

import CreateEmployeeCertificationModal from "../../components/employee-certifications/CreateEmployeeCertificationModal";
import EditEmployeeCertificationModal from "../../components/employee-certifications/EditEmployeeCertificationModal";
import UploadEmployeeCertificationModal from "../../components/employee-certifications/UploadEmployeeCertificationModal";
import ViewEmployeeCertificationModal from "../../components/employee-certifications/ViewEmployeeCertificationModal";

const TABLE_COLS = 15;

export default function EmployeeCertificationPage() {
    const [role] = useState(() => getCurrentRole());
    const isPic = role === "PIC";
    const isSuperadmin = role === "SUPERADMIN";

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [institutionOptions, setInstitutionOptions] = useState([]);
    const [certCodeOptions, setCertCodeOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subFieldOptions, setSubFieldOptions] = useState([]);

    const [filterEmployee, setFilterEmployee] = useState(null);
    const [filterCertCode, setFilterCertCode] = useState([]);
    const [filterLevel, setFilterLevel] = useState([]);
    const [filterSubField, setFilterSubField] = useState([]);
    const [filterInstitution, setFilterInstitution] = useState([]);
    const [filterStatus, setFilterStatus] = useState([]);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [uploadData, setUploadData] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null });

    const statusBadgeClass = useMemo(
        () => ({
            PENDING: "badge-info",
            ACTIVE: "badge-success",
            DUE: "badge-warning",
            EXPIRED: "badge-error",
            INVALID: "badge-secondary",
            NOT_YET_CERTIFIED: "badge-secondary",
        }),
        []
    );

    function formatStatusLabel(status) {
        if (!status) return "-";
        switch (status) {
            case "PENDING":
                return "Pending Upload";
            case "ACTIVE":
                return "Active";
            case "DUE":
                return "Due";
            case "EXPIRED":
                return "Expired";
            case "INVALID":
                return "Tidak Valid";
            case "NOT_YET_CERTIFIED":
                return "Belum Sertifikasi";
            default: {
                const s = status.toString().toLowerCase();
                return s.charAt(0).toUpperCase() + s.slice(1);
            }
        }
    }

    function buildParams() {
        return {
            page: page - 1,
            size: rowsPerPage,
            employeeIds: filterEmployee ? [filterEmployee.value] : [],
            certCodes: filterCertCode.map((f) => f.value),
            levels: filterLevel.map((f) => f.value),
            subCodes: filterSubField.map((f) => f.value),
            institutionIds: filterInstitution.map((f) => f.value),
            statuses: filterStatus.map((f) => f.value),
        };
    }

    async function load() {
        setLoading(true);
        try {
            const res = await fetchCertifications(buildParams());
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch (err) {
            console.error("load error:", err);
            toast.error("Gagal memuat sertifikasi pegawai");
        } finally {
            setLoading(false);
        }
    }

    async function loadFilters() {
        try {
            const [rules, insts] = await Promise.all([fetchCertificationRules(), fetchInstitutions()]);

            const allCertCodeOpts = [...new Set((rules || []).map((r) => r.certificationCode).filter(Boolean))]
                .sort()
                .map((code) => ({ value: code, label: code }));

            const levelOpts = [
                ...new Set(
                    (rules || []).map((r) => r.certificationLevelLevel).filter((v) => v !== null && v !== undefined)
                ),
            ]
                .sort((a, b) => a - b)
                .map((lvl) => ({ value: lvl, label: String(lvl) }));

            const subFieldOpts = [...new Set((rules || []).map((r) => r.subFieldCode).filter(Boolean))]
                .sort()
                .map((sf) => ({ value: sf, label: sf }));

            if (isPic) {
                const scope = await fetchMyPicScope();
                const allowed = new Set((scope?.certifications || []).map((c) => c.certificationCode).filter(Boolean));
                setCertCodeOptions(allCertCodeOpts.filter((o) => allowed.has(o.value)));
            } else {
                setCertCodeOptions(allCertCodeOpts);
            }

            setLevelOptions(levelOpts);
            setSubFieldOptions(subFieldOpts);
            setInstitutionOptions((insts || []).map((i) => ({ value: i.id, label: i.name })));
        } catch (err) {
            console.error("loadFilters error:", err);
            toast.error("Gagal memuat filter");
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

    async function onDelete(id) {
        if (!id) return;
        try {
            await deleteCertification(id);
            toast.success("Sertifikasi pegawai dihapus");
            await load();
        } catch {
            toast.error("Gagal hapus sertifikasi");
        }
    }

    async function handleExport() {
        try {
            const params = {
                employeeIds: filterEmployee ? [filterEmployee.value] : [],
                certCodes: filterCertCode.map((f) => f.value),
                levels: filterLevel.map((f) => f.value),
                subCodes: filterSubField.map((f) => f.value),
                institutionIds: filterInstitution.map((f) => f.value),
                statuses: filterStatus.map((f) => f.value),
            };

            const blob = await exportCertifications(params);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `employee-certifications-${new Date().toISOString().slice(0, 10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("export error:", err);
            toast.error("Gagal export excel");
        }
    }

    function resetFilter() {
        setFilterEmployee(null);
        setFilterCertCode([]);
        setFilterLevel([]);
        setFilterSubField([]);
        setFilterInstitution([]);
        setFilterStatus([]);
        setPage(1);
        toast.success("Filter dibersihkan");
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        rowsPerPage,
        filterEmployee,
        filterCertCode,
        filterLevel,
        filterSubField,
        filterInstitution,
        filterStatus,
    ]);

    useEffect(() => {
        setPage(1);
    }, [filterEmployee, filterCertCode, filterLevel, filterSubField, filterInstitution, filterStatus]);

    useEffect(() => {
        loadFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role]);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Sertifikat Pegawai</h1>
                    <p className="text-xs text-gray-500">{totalElements} sertifikat terdaftar</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="btn btn-sm btn-primary rounded-lg"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={14} />
                        Tambah Sertifikat
                    </button>
                    <button className="btn btn-sm btn-neutral rounded-lg" onClick={handleExport}>
                        <Download size={14} />
                        Export Excel
                    </button>
                    <button
                        className="btn btn-sm btn-accent rounded-lg"
                        onClick={() => (window.location.href = "/employee/certification/histories")}
                    >
                        <HistoryIcon size={14} />
                        Histori
                    </button>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Pegawai
                        </label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={loadEmployees}
                            value={filterEmployee}
                            onChange={setFilterEmployee}
                            placeholder="Filter Pegawai"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Cert Code
                        </label>
                        <Select
                            isMulti
                            options={certCodeOptions}
                            value={filterCertCode}
                            onChange={setFilterCertCode}
                            placeholder="Filter Cert Code"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Jenjang
                        </label>
                        <Select
                            isMulti
                            options={levelOptions}
                            value={filterLevel}
                            onChange={setFilterLevel}
                            placeholder="Filter Jenjang"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Sub Field
                        </label>
                        <Select
                            isMulti
                            options={subFieldOptions}
                            value={filterSubField}
                            onChange={setFilterSubField}
                            placeholder="Filter Sub Field"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Lembaga
                        </label>
                        <Select
                            isMulti
                            options={institutionOptions}
                            value={filterInstitution}
                            onChange={setFilterInstitution}
                            placeholder="Filter Lembaga"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Status
                        </label>
                        <Select
                            isMulti
                            options={[
                                { value: "PENDING", label: "Pending" },
                                { value: "ACTIVE", label: "Active" },
                                { value: "DUE", label: "Due" },
                                { value: "EXPIRED", label: "Expired" },
                                { value: "INVALID", label: "Invalid" },
                                { value: "NOT_YET_CERTIFIED", label: "Belum Sertifikasi" },
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="Filter Status"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-3">
                    <button className="btn btn-sm btn-accent btn-soft rounded-lg flex gap-2" onClick={resetFilter}>
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
                                <th className="w-12">No</th>
                                <th className="w-32">Aksi</th>
                                <th>NIP</th>
                                <th>Nama Pegawai</th>
                                <th>Jabatan</th>
                                <th className="w-28">Status</th>
                                <th>Cert Code</th>
                                <th>Jenjang</th>
                                <th>Sub Bidang</th>
                                <th>No Sertifikat</th>
                                <th>Tanggal Sertifikat</th>
                                <th>Tanggal Kadaluarsa</th>
                                <th>Reminder</th>
                                <th>Lembaga</th>
                                <th>Updated At</th>
                            </tr>
                        </thead>
                        <tbody>
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
                                            <Award size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data sertifikasi</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <div className="tooltip" data-tip="Lihat detail sertifikat">
                                                    <button
                                                        className="btn btn-xs btn-info btn-soft border border-info rounded-lg"
                                                        type="button"
                                                        onClick={() => setViewData(r)}
                                                    >
                                                        <Eye size={12} />
                                                    </button>
                                                </div>

                                                <div className="tooltip" data-tip="Edit data sertifikat">
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-warning btn-soft border border-warning rounded-lg"
                                                        onClick={() => setEditData(r)}
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>

                                                <div className="tooltip" data-tip="Hapus sertifikat">
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-error btn-soft border border-error rounded-lg"
                                                        onClick={() => setConfirm({ open: true, id: r.id })}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>

                                                {r.status === "PENDING" && (
                                                    <div className="tooltip" data-tip="Upload file sertifikat">
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-success btn-soft border border-success rounded-lg"
                                                            onClick={() => setUploadData(r)}
                                                        >
                                                            <Upload size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td>{r.nip}</td>
                                        <td className="font-medium">{r.employeeName}</td>
                                        <td>{r.jobPositionTitle || "-"}</td>

                                        <td>
                                            <span
                                                className={`badge badge-sm text-white whitespace-nowrap ${
                                                    statusBadgeClass[r.status] || "badge-secondary"
                                                }`}
                                            >
                                                {formatStatusLabel(r.status)}
                                            </span>
                                        </td>

                                        <td>{r.certificationCode}</td>
                                        <td>{r.certificationLevelLevel || "-"}</td>
                                        <td>{r.subFieldCode || "-"}</td>
                                        <td>{r.certNumber || "-"}</td>
                                        <td>{formatDate(r.certDate)}</td>
                                        <td>{formatDate(r.validUntil)}</td>
                                        <td>{formatDate(r.reminderDate)}</td>
                                        <td>{r.institutionName || "-"}</td>
                                        <td>{formatDateTime(r.updatedAt)}</td>
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
                <CreateEmployeeCertificationModal
                    open={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSaved={() => {
                        setPage(1);
                        load();
                    }}
                />
            )}

            {editData && (
                <EditEmployeeCertificationModal
                    open={!!editData}
                    data={editData}
                    onClose={() => setEditData(null)}
                    onSaved={() => {
                        setPage(1);
                        load();
                    }}
                />
            )}

            {uploadData && (
                <UploadEmployeeCertificationModal
                    open={!!uploadData}
                    certId={uploadData.id}
                    onClose={() => setUploadData(null)}
                    onUploaded={() => {
                        setPage(1);
                        load();
                    }}
                />
            )}

            {viewData && (
                <ViewEmployeeCertificationModal
                    open={!!viewData}
                    certId={viewData.id}
                    onClose={() => setViewData(null)}
                />
            )}

            <ConfirmDialog
                open={confirm.open}
                title="Hapus Sertifikasi Pegawai?"
                message="Data sertifikat ini akan dihapus dari sistem."
                onConfirm={async () => {
                    await onDelete(confirm.id);
                    setConfirm({ open: false, id: null });
                }}
                onCancel={() => setConfirm({ open: false, id: null })}
            />
        </div>
    );
}
