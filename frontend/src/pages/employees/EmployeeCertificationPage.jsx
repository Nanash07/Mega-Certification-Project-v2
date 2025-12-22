// src/pages/employees/EmployeeCertificationPage.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { Plus, History as HistoryIcon, Eraser, Pencil, Trash2, Upload, Eye, Download } from "lucide-react";

import Pagination from "../../components/common/Pagination";

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

function getCurrentRole() {
    if (typeof window === "undefined") return "";
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const fromUser = (user.role || "").toString().toUpperCase();
        if (fromUser) return fromUser;
    } catch {}
    return (localStorage.getItem("role") || "").toString().toUpperCase();
}

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

    function formatDate(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    }

    function formatDateTime(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (isNaN(d.getTime())) return "-";
        return d.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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
        <div>
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary w-full"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Tambah Sertifikat</span>
                        </button>
                    </div>

                    <div className="col-span-1">
                        <button type="button" className="btn btn-sm btn-neutral w-full" onClick={handleExport}>
                            <Download className="w-4 h-4" />
                            <span>Export Excel</span>
                        </button>
                    </div>

                    <div className="col-span-2" />

                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-sm btn-accent w-full"
                            onClick={() => (window.location.href = "/employee/certification/histories")}
                        >
                            <HistoryIcon className="w-4 h-4" />
                            <span>Histori</span>
                        </button>
                    </div>

                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-sm btn-accent btn-soft border-accent w-full"
                            onClick={() => {
                                setFilterEmployee(null);
                                setFilterCertCode([]);
                                setFilterLevel([]);
                                setFilterSubField([]);
                                setFilterInstitution([]);
                                setFilterStatus([]);
                                setPage(1);
                                toast.success("Clear filter berhasil");
                            }}
                        >
                            <Eraser className="w-4 h-4" />
                            <span>Clear Filter</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <AsyncSelect
                        cacheOptions
                        defaultOptions
                        loadOptions={loadEmployees}
                        value={filterEmployee}
                        onChange={setFilterEmployee}
                        placeholder="Filter Pegawai"
                        isClearable
                    />

                    <Select
                        isMulti
                        options={certCodeOptions}
                        value={filterCertCode}
                        onChange={setFilterCertCode}
                        placeholder="Filter Cert Code"
                    />

                    <Select
                        isMulti
                        options={levelOptions}
                        value={filterLevel}
                        onChange={setFilterLevel}
                        placeholder="Filter Jenjang"
                    />

                    <Select
                        isMulti
                        options={subFieldOptions}
                        value={filterSubField}
                        onChange={setFilterSubField}
                        placeholder="Filter Sub Field"
                    />

                    <Select
                        isMulti
                        options={institutionOptions}
                        value={filterInstitution}
                        onChange={setFilterInstitution}
                        placeholder="Filter Lembaga"
                    />

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
                    />
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
                            <th>Status</th>
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
                                        <div className="flex gap-2">
                                            <div className="tooltip" data-tip="Lihat detail sertifikat">
                                                <button
                                                    className="btn btn-xs btn-info btn-soft border-info"
                                                    type="button"
                                                    onClick={() => setViewData(r)}
                                                    title="Lihat sertifikat"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="tooltip" data-tip="Edit data sertifikat">
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-warning btn-soft border-warning"
                                                    onClick={() => setEditData(r)}
                                                    title="Edit sertifikat"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="tooltip" data-tip="Hapus sertifikat">
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-error btn-soft border-error"
                                                    onClick={() => setConfirm({ open: true, id: r.id })}
                                                    title="Hapus sertifikat"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {r.status === "PENDING" && (
                                                <div className="tooltip" data-tip="Upload file sertifikat">
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-success btn-soft border-success"
                                                        onClick={() => setUploadData(r)}
                                                        title="Upload sertifikat"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td>{r.nip}</td>
                                    <td>{r.employeeName}</td>
                                    <td>{r.jobPositionTitle || "-"}</td>

                                    <td>
                                        <div className="tooltip" data-tip={formatStatusLabel(r.status)}>
                                            <span
                                                className={`badge badge-sm text-white whitespace-nowrap ${
                                                    statusBadgeClass[r.status] || "badge-secondary"
                                                }`}
                                            >
                                                {formatStatusLabel(r.status)}
                                            </span>
                                        </div>
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

            {confirm.open && (
                <dialog className="modal" open={confirm.open}>
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Hapus Sertifikasi Pegawai?</h3>
                        <p className="py-2">Data sertifikat ini akan dihapus dari sistem.</p>
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
