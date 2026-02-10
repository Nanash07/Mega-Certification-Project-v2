import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AsyncSelect from "react-select/async"; // Changed import
import { Download, Upload, History as HistoryIcon, Pencil, Trash2, Eraser, ChevronDown, Filter, Link2 } from "lucide-react";

import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getCurrentRole, formatDateTime } from "../../utils/helpers";
import {
    fetchJobCertificationMappingsPaged,
    deleteJobCertificationMapping,
    toggleJobCertificationMapping,
    fetchDistinctJobs,
    fetchDistinctCertifications,
    fetchDistinctLevels,
    fetchDistinctSubFields,
} from "../../services/jobCertificationMappingService";
import { fetchMyPicScope } from "../../services/picScopeService";
import EditJobCertificationMappingModal from "../../components/job-certification-mapping/EditJobCertificationMappingModal";
import { downloadJobCertTemplate } from "../../services/jobCertificationImportService";
import ImportJobCertificationMappingModal from "../../components/job-certification-mapping/ImportJobCertificationMappingModal";

const TABLE_COLS = 8;

export default function JobCertificationMappingPage() {
    const navigate = useNavigate();

    const [role] = useState(() => getCurrentRole());
    const isSuperadmin = role === "SUPERADMIN";
    const isPic = role === "PIC";
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Removed static options state

    const [filterJob, setFilterJob] = useState(null);
    const [filterCert, setFilterCert] = useState(null);
    const [filterLevel, setFilterLevel] = useState(null);
    const [filterSub, setFilterSub] = useState(null);
    const [filterStatus, setFilterStatus] = useState({ value: "all", label: "Semua" });

    const [allowedCertificationIds, setAllowedCertificationIds] = useState(null);

    const [editItem, setEditItem] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null });
    const [openImport, setOpenImport] = useState(false);
    const [statusMenu, setStatusMenu] = useState(null);

    function getStatusStyle(isActive) {
        if (isActive) {
            return { label: "Aktif", badgeCls: "badge-success", btnCls: "btn-success" };
        }
        return { label: "Nonaktif", badgeCls: "badge-secondary", btnCls: "btn-secondary" };
    }

    function renderStatusBadge(row) {
        const { label, badgeCls } = getStatusStyle(row.isActive);
        return (
            <button
                type="button"
                className={`badge badge-sm whitespace-nowrap cursor-pointer flex items-center gap-1 ${badgeCls} text-white`}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStatusMenu({ row, x: rect.left, y: rect.bottom + 4 });
                }}
            >
                <span>{label}</span>
                <ChevronDown className="w-3 h-3" />
            </button>
        );
    }

    useEffect(() => {
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
    }, [isEmployee]);

    useEffect(() => {
        load();
    }, [page, rowsPerPage, filterJob, filterCert, filterLevel, filterSub, filterStatus, allowedCertificationIds]);

    async function load() {
        if (isEmployee) return;
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                jobIds: filterJob ? filterJob.value : undefined,
                certCodes: filterCert ? filterCert.value : undefined,
                levels: filterLevel ? filterLevel.value : undefined,
                subCodes: filterSub ? filterSub.value : undefined,
                status: filterStatus?.value || "all",
            };

            if (isPic) {
                // Determine scope if not already set (though for AsyncSelect we handle differently)
                // For main table load, we might need scope to enforce filter.
                // Current logic for load() uses allowedCertificationIds if set.
                // We should ensure allowedCertificationIds is fetched once.
                if (!allowedCertificationIds) {
                    const scope = await fetchMyPicScope();
                    const ids = (scope?.certifications || []).map(s => s.certificationId).filter(id => id != null);
                    if (ids.length > 0) {
                        setAllowedCertificationIds(ids);
                        // Re-trigger load will happen via useEffect dependency
                        return; 
                    }
                } else if (allowedCertificationIds.length > 0) {
                     params.allowedCertificationIds = allowedCertificationIds.join(",");
                }
            }

            const res = await fetchJobCertificationMappingsPaged(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch (e) {
            console.error("fetchJobCertificationMappingsPaged error:", e);
            toast.error("Gagal memuat mapping");
        } finally {
            setLoading(false);
        }
    }

    // Load filter scope for PIC once
    useEffect(() => {
        if (isPic && !allowedCertificationIds) {
             fetchMyPicScope().then(scope => {
                const ids = (scope?.certifications || []).map(s => s.certificationId).filter(id => id != null);
                setAllowedCertificationIds(ids);
             }).catch(() => {});
        }
    }, [isPic]);

    function resetFilter() {
        setFilterJob(null);
        setFilterCert(null);
        setFilterLevel(null);
        setFilterSub(null);
        setFilterStatus({ value: "all", label: "Semua" });
        setPage(1);
        toast.success("Filter dibersihkan");
    }

    // Custom styles matching Dashboard
    const selectStyles = {
        control: (base) => ({
            ...base,
            minHeight: '32px',
            height: '32px',
            fontSize: '12px',
        }),
        valueContainer: (base) => ({
            ...base,
            height: '32px',
            padding: '0 8px',
        }),
        input: (base) => ({
            ...base,
            margin: '0px',
            padding: '0px',
        }),
        indicatorsContainer: (base) => ({
            ...base,
            height: '32px',
        }),
        dropdownIndicator: (base) => ({
            ...base,
            padding: '4px',
        }),
        clearIndicator: (base) => ({
            ...base,
            padding: '4px',
        }),
        option: (base) => ({
            ...base,
            fontSize: '12px',
            padding: '6px 10px',
        }),
        menu: (base) => ({
            ...base,
            fontSize: '12px',
        }),
    };

    const loadJobOptions = (inputValue, callback) => {
        fetchDistinctJobs({ page: 0, size: 20, search: inputValue }) // param name 'search' matches backend
            .then((res) => {
                const list = res.content || [];
                const options = list.map((r) => ({ value: r.id, label: r.name }));
                callback(options);
            })
            .catch(() => callback([]));
    };

    const loadCertOptions = (inputValue, callback) => {
        fetchDistinctCertifications({ page: 0, size: 20, search: inputValue })
            .then((res) => {
                const list = res.content || [];
                // If PIC, filter based on allowed ids if needed, but backend distinct query doesn't know scope.
                // Ideally backend should filter distincts by PIC scope.
                // For now, we trust the backend distinct list.
                // If strict PIC scoping is needed for dropdown logic, backend endpoint needs allowedCertificationIds.
                const options = list.map((r) => ({ value: r.code, label: r.code }));
                callback(options);
            })
            .catch(() => callback([]));
    };

    const loadLevelOptions = (inputValue, callback) => {
        fetchDistinctLevels({ page: 0, size: 20, search: inputValue })
            .then((res) => {
                const list = res.content || [];
                const options = list.map((r) => ({ value: r.level, label: r.name }));
                callback(options);
            })
            .catch(() => callback([]));
    };

    const loadSubOptions = (inputValue, callback) => {
        fetchDistinctSubFields({ page: 0, size: 20, search: inputValue })
            .then((res) => {
                const list = res.content || [];
                const options = list.map((r) => ({ value: r.code, label: r.code }));
                callback(options);
            })
            .catch(() => callback([]));
    };

    async function handleChangeStatus(row, desiredActive) {
        if (row.isActive === desiredActive) return;
        try {
            await toggleJobCertificationMapping(row.id);
            await load();
            toast.success(desiredActive ? "Mapping diaktifkan" : "Mapping dinonaktifkan");
        } catch {
            toast.error("Gagal mengubah status mapping");
        }
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    if (isEmployee) return null;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Mapping Jabatan - Sertifikasi</h1>
                    <p className="text-xs text-gray-500">{totalElements} mapping terdaftar</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="btn btn-sm btn-success rounded-lg"
                        onClick={() => setOpenImport(true)}
                    >
                        <Upload size={14} />
                        Import Excel
                    </button>
                    <button
                        className="btn btn-sm btn-secondary rounded-lg"
                        onClick={downloadJobCertTemplate}
                    >
                        <Download size={14} />
                        Download Template
                    </button>
                    <button
                        className="btn btn-sm btn-accent rounded-lg"
                        onClick={() => navigate("/mapping/job-certification/histories")}
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
                            <Filter size={12} /> Jabatan
                        </label>
                        <AsyncSelect
                            cacheOptions
                            loadOptions={loadJobOptions}
                            defaultOptions
                            value={filterJob}
                            onChange={(val) => {
                                setPage(1);
                                setFilterJob(val);
                            }}
                            placeholder="Ketik jabatan..."
                            isClearable
                            className="text-xs"
                            styles={selectStyles}
                            noOptionsMessage={() => "Tidak ditemukan"}
                            loadingMessage={() => "Mencari..."}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Sertifikasi
                        </label>
                        <AsyncSelect
                            cacheOptions
                            loadOptions={loadCertOptions}
                            defaultOptions
                            value={filterCert}
                            onChange={(val) => {
                                setPage(1);
                                setFilterCert(val);
                            }}
                            placeholder="Ketik sertifikasi..."
                            isClearable
                            className="text-xs"
                            styles={selectStyles}
                            noOptionsMessage={() => "Tidak ditemukan"}
                            loadingMessage={() => "Mencari..."}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Level
                        </label>
                        <AsyncSelect
                            cacheOptions
                            loadOptions={loadLevelOptions}
                            defaultOptions
                            value={filterLevel}
                            onChange={(val) => {
                                setPage(1);
                                setFilterLevel(val);
                            }}
                            placeholder="Ketik level..."
                            isClearable
                            className="text-xs"
                            styles={selectStyles}
                            noOptionsMessage={() => "Tidak ditemukan"}
                            loadingMessage={() => "Mencari..."}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Sub Bidang
                        </label>
                        <AsyncSelect
                            cacheOptions
                            loadOptions={loadSubOptions}
                            defaultOptions
                            value={filterSub}
                            onChange={(val) => {
                                setPage(1);
                                setFilterSub(val);
                            }}
                            placeholder="Ketik sub bidang..."
                            isClearable
                            className="text-xs"
                            styles={selectStyles}
                            noOptionsMessage={() => "Tidak ditemukan"}
                            loadingMessage={() => "Mencari..."}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Status
                        </label>
                        <Select
                            options={[
                                { value: "all", label: "Semua" },
                                { value: "active", label: "Aktif" },
                                { value: "inactive", label: "Nonaktif" },
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="Semua Status"
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <button
                            className="btn btn-sm btn-accent btn-soft w-full flex gap-2 rounded-lg"
                            onClick={resetFilter}
                        >
                            <Eraser size={14} />
                            Clear Filter
                        </button>
                    </div>
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
                                <th>Jabatan</th>
                                <th>Sertifikasi</th>
                                <th>Jenjang</th>
                                <th>Sub Bidang</th>
                                <th className="w-28">Status</th>
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
                                            <Link2 size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data mapping</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <div className="tooltip" data-tip="Edit mapping">
                                                    <button
                                                        className="btn btn-xs btn-warning btn-soft border border-warning rounded-lg"
                                                        onClick={() => setEditItem(r)}
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                                <div className="tooltip" data-tip="Hapus mapping">
                                                    <button
                                                        className="btn btn-xs btn-error btn-soft border border-error rounded-lg"
                                                        onClick={() => setConfirm({ open: true, id: r.id })}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-medium">{r.jobName}</td>
                                        <td>{r.certificationCode}</td>
                                        <td>{r.certificationLevelLevel || "-"}</td>
                                        <td>{r.subFieldCode || "-"}</td>
                                        <td>{renderStatusBadge(r)}</td>
                                        <td className="text-gray-500">{formatDateTime(r.updatedAt)}</td>
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

            {/* Modals */}
            <EditJobCertificationMappingModal
                open={!!editItem}
                initial={editItem}
                onClose={() => setEditItem(null)}
                onSaved={() => {
                    setEditItem(null);
                    load();
                }}
            />

            <ImportJobCertificationMappingModal
                open={openImport}
                onClose={() => setOpenImport(false)}
                onImported={load}
            />

            <ConfirmDialog
                open={confirm.open}
                title="Hapus Mapping?"
                message="Mapping ini akan dinonaktifkan dari sistem."
                onConfirm={() => {
                    deleteJobCertificationMapping(confirm.id)
                        .then(() => {
                            toast.success("Mapping dihapus");
                            load();
                        })
                        .catch(() => toast.error("Gagal menghapus mapping"))
                        .finally(() => setConfirm({ open: false, id: null }));
                }}
                onCancel={() => setConfirm({ open: false, id: null })}
            />

            {/* Floating status menu */}
            {statusMenu && (
                <div className="fixed inset-0 z-[999]" onClick={() => setStatusMenu(null)}>
                    <div
                        className="absolute"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-xl border border-gray-200 p-2 text-xs flex flex-col gap-1.5">
                            {[
                                { active: true, label: "Aktif" },
                                { active: false, label: "Nonaktif" },
                            ].map(({ active, label }) => {
                                const { btnCls } = getStatusStyle(active);
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        className={`btn btn-xs ${btnCls} text-white rounded-lg w-full justify-center`}
                                        onClick={async () => {
                                            await handleChangeStatus(statusMenu.row, active);
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
