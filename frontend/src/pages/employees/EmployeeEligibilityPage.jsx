import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import { getCurrentRole, formatDate } from "../../utils/helpers";
import {
    fetchEmployeeEligibilityPaged,
    refreshEmployeeEligibility,
    exportEmployeeEligibilityExcel,
    getCurrentEmployeeId,
} from "../../services/employeeEligibilityService";
import { fetchAllJobPositions } from "../../services/jobPositionService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { searchEmployees } from "../../services/employeeService";
import { fetchMyPicScope } from "../../services/picScopeService";
import { RotateCw, Eraser, Download, ClipboardList, Search, Briefcase, Award, Layers, Grid3X3, Filter, FileSpreadsheet } from "lucide-react";

const TABLE_COLS = 19;

export default function EmployeeEligibilityPage() {
    const [searchParams] = useSearchParams();
    const [role] = useState(() => getCurrentRole());
    const isSuperadmin = role === "SUPERADMIN";
    const isPic = role === "PIC";
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";
    const canRefresh = isSuperadmin || isPic;
    const isSelfMode = isEmployee;
    const showRefreshButton = canRefresh && !isSelfMode;

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [filterEmployee, setFilterEmployee] = useState(null);
    const [filterJob, setFilterJob] = useState(null);
    const [filterCert, setFilterCert] = useState(null);
    const [filterLevel, setFilterLevel] = useState(null);
    const [filterSub, setFilterSub] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterSource, setFilterSource] = useState(null);

    const [jobOptions, setJobOptions] = useState([]);
    const [certOptions, setCertOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subOptions, setSubOptions] = useState([]);

    // Status options for filter
    const statusOptions = useMemo(
        () => [
            { value: "NOT_YET_CERTIFIED", label: "Belum Sertifikasi" },
            { value: "ACTIVE", label: "Active" },
            { value: "DUE", label: "Due" },
            { value: "EXPIRED", label: "Expired" },
        ],
        []
    );

    // Read URL query params on mount and URL change
    useEffect(() => {
        const statusParam = searchParams.get("status");
        if (statusParam) {
            const opts = [
                { value: "NOT_YET_CERTIFIED", label: "Belum Sertifikasi" },
                { value: "ACTIVE", label: "Active" },
                { value: "DUE", label: "Due" },
                { value: "EXPIRED", label: "Expired" },
            ];
            const statusOption = opts.find((s) => s.value === statusParam);
            if (statusOption) {
                setFilterStatus(statusOption);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.get("status")]);

    const statusBadgeClass = useMemo(
        () => ({
            ACTIVE: "badge-success",
            DUE: "badge-warning",
            EXPIRED: "badge-error",
            NOT_YET_CERTIFIED: "badge-secondary",
        }),
        []
    );

    function formatStatusLabel(s) {
        switch (s) {
            case "NOT_YET_CERTIFIED":
                return "Belum Sertifikasi";
            case "ACTIVE":
            case "DUE":
            case "EXPIRED":
                return s.charAt(0) + s.slice(1).toLowerCase();
            default:
                return s || "-";
        }
    }

    function formatSourceLabel(s) {
        if (s === "BY_JOB") return "By Job";
        if (s === "BY_NAME") return "By Name";
        return s ?? "-";
    }

    async function load() {
        setLoading(true);
        try {
            const employeeId = getCurrentEmployeeId();
            const employeeIdsParam = isSelfMode
                ? employeeId
                    ? [employeeId]
                    : []
                : filterEmployee
                ? [filterEmployee.value]
                : [];
            const params = {
                page: page - 1,
                size: rowsPerPage,
                employeeIds: employeeIdsParam,
                jobIds: filterJob ? [filterJob.value] : [],
                certCodes: filterCert ? [filterCert.value] : [],
                levels: filterLevel ? [filterLevel.value] : [],
                subCodes: filterSub ? [filterSub.value] : [],
                statuses: filterStatus ? [filterStatus.value] : [],
                sources: filterSource ? [filterSource.value] : [],
            };
            const res = await fetchEmployeeEligibilityPaged(params);
            if (isSelfMode) {
                const uniqueCodes = Array.from(
                    new Set((res?.content || []).map((r) => r.certificationCode).filter(Boolean))
                );
                setCertOptions(uniqueCodes.map((code) => ({ value: code, label: code })));
            }
            setRows(res?.content || []);
            setTotalPages(res?.totalPages || 1);
            setTotalElements(res?.totalElements || 0);
        } catch {
            toast.error("Gagal memuat eligibility");
        } finally {
            setLoading(false);
        }
    }

    async function onRefresh() {
        if (!canRefresh || isSelfMode) return;
        setRefreshing(true);
        try {
            await refreshEmployeeEligibility();
            toast.success("Eligibility berhasil di-refresh");
            await load();
        } catch {
            toast.error("Gagal refresh eligibility");
        } finally {
            setRefreshing(false);
        }
    }

    async function onExport() {
        setExporting(true);
        try {
            const employeeId = getCurrentEmployeeId();
            const employeeIdsParam = isSelfMode
                ? employeeId
                    ? [employeeId]
                    : []
                : filterEmployee
                ? [filterEmployee.value]
                : [];
            await exportEmployeeEligibilityExcel({
                employeeIds: employeeIdsParam,
                jobIds: filterJob ? [filterJob.value] : [],
                certCodes: filterCert ? [filterCert.value] : [],
                levels: filterLevel ? [filterLevel.value] : [],
                subCodes: filterSub ? [filterSub.value] : [],
                statuses: filterStatus ? [filterStatus.value] : [],
                sources: filterSource ? [filterSource.value] : [],
            });
            toast.success("Export berhasil");
        } catch {
            toast.error("Gagal export excel");
        } finally {
            setExporting(false);
        }
    }

    async function loadFilters() {
        try {
            const [jobs, levels, subs] = await Promise.all([
                fetchAllJobPositions(),
                fetchCertificationLevels(),
                fetchSubFields(),
            ]);
            setJobOptions(jobs.map((j) => ({ value: j.id, label: j.name })));
            setLevelOptions(levels.map((l) => ({ value: l.level, label: String(l.level) })));
            setSubOptions(subs.map((s) => ({ value: s.code, label: s.code })));
            if (isPic) {
                const scope = await fetchMyPicScope();
                setCertOptions(
                    (scope?.certifications || []).map((s) => ({
                        value: s.certificationCode,
                        label: s.certificationCode,
                    }))
                );
            } else if (isSuperadmin) {
                const certs = await fetchCertifications();
                setCertOptions(certs.map((c) => ({ value: c.code, label: c.code })));
            }
        } catch {
            toast.error("Gagal memuat filter");
        }
    }

    const loadEmployees = async (input) => {
        try {
            const res = await searchEmployees({ search: input, page: 0, size: 20 });
            return res.content.map((e) => ({
                value: e.id,
                label: `${e.nip} - ${e.name}`,
            }));
        } catch {
            return [];
        }
    };

    const clearFilter = () => {
        if (!isSelfMode) setFilterEmployee(null);
        setFilterJob(null);
        setFilterCert(null);
        setFilterLevel(null);
        setFilterSub(null);
        setFilterStatus(null);
        setFilterSource(null);
        setPage(1);
        toast.success("Filter dibersihkan");
    };

    useEffect(() => {
        load();
    }, [
        page,
        rowsPerPage,
        filterEmployee,
        filterJob,
        filterCert,
        filterLevel,
        filterSub,
        filterStatus,
        filterSource,
        role,
    ]);

    useEffect(() => {
        setPage(1);
    }, [filterEmployee, filterJob, filterCert, filterLevel, filterSub, filterStatus, filterSource, role]);

    useEffect(() => {
        loadFilters();
    }, []);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Data Eligibility</h1>
                    <p className="text-xs text-gray-500">{totalElements} data eligibility</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {showRefreshButton && (
                        <button
                            type="button"
                            className={`btn btn-sm btn-primary rounded-lg ${refreshing ? "btn-disabled" : ""}`}
                            onClick={onRefresh}
                            disabled={refreshing}
                        >
                            {refreshing ? (
                                <>
                                    <span className="loading loading-spinner loading-xs" />
                                    Refreshing...
                                </>
                            ) : (
                                <>
                                    <RotateCw size={14} />
                                    Refresh Eligibility
                                </>
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        className={`btn btn-sm btn-neutral rounded-lg ${exporting ? "btn-disabled" : ""}`}
                        onClick={onExport}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <>
                                <span className="loading loading-spinner loading-xs" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download size={14} />
                                Export Excel
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {!isSelfMode && (
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
                    )}

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Briefcase size={12} /> Jabatan
                        </label>
                        <Select
                            options={jobOptions}
                            value={filterJob}
                            onChange={setFilterJob}
                            placeholder="Semua Jabatan"
                            isClearable
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
                            placeholder="Semua Sertifikasi"
                            isClearable
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
                            placeholder="Semua Level"
                            isClearable
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
                            placeholder="Semua Sub Bidang"
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
                            onChange={setFilterStatus}
                            placeholder="Semua Status"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <FileSpreadsheet size={12} /> Source
                        </label>
                        <Select
                            options={[
                                { value: "BY_JOB", label: "By Job" },
                                { value: "BY_NAME", label: "By Name" },
                            ]}
                            value={filterSource}
                            onChange={setFilterSource}
                            placeholder="Semua Source"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <button
                            className="btn btn-sm btn-accent btn-soft w-full flex gap-2 rounded-lg"
                            type="button"
                            onClick={clearFilter}
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
                                <th>NIP</th>
                                <th>Nama Pegawai</th>
                                <th>Jabatan</th>
                                <th>Sertifikat</th>
                                <th>Jenjang</th>
                                <th>Sub Bidang</th>
                                <th>No Sertifikat</th>
                                <th>Tgl Sertifikasi</th>
                                <th>Keterangan</th>
                                <th>SK Efektif</th>
                                <th>Status</th>
                                <th>Expired Date</th>
                                <th>Due Date</th>
                                <th>Wajib Memiliki</th>
                                <th>Sumber</th>
                                <th>Training</th>
                                <th>Refreshment</th>
                                <th>Perpanjang</th>
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
                                            <ClipboardList size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data eligibility</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id ?? `${r.employeeId}-${r.certificationRuleId}`} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>{r.nip}</td>
                                        <td className="font-medium">
                                            <div className="tooltip" data-tip="Lihat detail pegawai">
                                                <Link
                                                    to={`/employee/${r.employeeId}`}
                                                    className="hover:underline cursor-pointer"
                                                >
                                                    {r.employeeName}
                                                </Link>
                                            </div>
                                        </td>
                                        <td>{r.jobPositionTitle || "-"}</td>
                                        <td>{r.certificationCode || "-"}</td>
                                        <td>{r.certificationLevelLevel || "-"}</td>
                                        <td>{r.subFieldCode || "-"}</td>
                                        <td>{r.certNumber || "-"}</td>
                                        <td>{formatDate(r.certDate)}</td>
                                        <td>
                                            {r.isCoveredByHigherLevel ? (
                                                <span className="badge badge-sm badge-accent text-white">Covered</span>
                                            ) : r.ownedLevel ? (
                                                <span className="badge badge-sm badge-success text-white">Sesuai</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td>{formatDate(r.effectiveDate)}</td>
                                        <td>
                                            <span
                                                className={`badge badge-sm text-white whitespace-nowrap ${
                                                    statusBadgeClass[r.status] ?? "badge-secondary"
                                                }`}
                                                title={r.sisaWaktu || ""}
                                            >
                                                {formatStatusLabel(r.status)}
                                            </span>
                                        </td>
                                        <td>{formatDate(r.dueDate)}</td>
                                        <td>{formatDate(r.reminderDate)}</td>
                                        <td>{formatDate(r.wajibPunyaSertifikasiSampai)}</td>
                                        <td>
                                            <span
                                                className={`badge badge-sm text-white whitespace-nowrap ${
                                                    r.source === "BY_JOB" ? "badge-neutral" : "badge-info"
                                                }`}
                                            >
                                                {formatSourceLabel(r.source)}
                                            </span>
                                        </td>
                                        <td className="text-center">{r.trainingCount ?? 0}</td>
                                        <td className="text-center">{r.refreshmentCount ?? 0}</td>
                                        <td className="text-center">{r.extensionCount ?? 0}</td>
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
        </div>
    );
}

