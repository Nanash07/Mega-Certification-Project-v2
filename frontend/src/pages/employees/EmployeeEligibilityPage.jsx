// src/pages/employees/EmployeeEligibilityPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";

import Pagination from "../../components/common/Pagination";
import {
    fetchEmployeeEligibilityPaged,
    refreshEmployeeEligibility,
    getCurrentEmployeeId,
} from "../../services/employeeEligibilityService";
import { fetchAllJobPositions } from "../../services/jobPositionService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { searchEmployees } from "../../services/employeeService";
import { fetchMyPicScope } from "../../services/picScopeService";

import { Eye, RotateCw, Eraser } from "lucide-react";

const TABLE_COLS = 17;

function getCurrentRole() {
    if (typeof window === "undefined") return "";
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const fromUser = (user.role || "").toString().toUpperCase();
        if (fromUser) return fromUser;
    } catch {}

    return (localStorage.getItem("role") || "").toString().toUpperCase();
}

function formatDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EmployeeEligibilityPage() {
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
        <div>
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="col-span-1">
                        {!isSelfMode && (
                            <AsyncSelect
                                cacheOptions
                                defaultOptions
                                loadOptions={loadEmployees}
                                value={filterEmployee}
                                onChange={setFilterEmployee}
                                placeholder="Filter Pegawai"
                                isClearable
                            />
                        )}
                    </div>

                    <div className={showRefreshButton ? "col-span-3" : "col-span-4"} />

                    {showRefreshButton && (
                        <div className="col-span-1">
                            <button
                                type="button"
                                className={`btn btn-primary btn-sm w-full ${refreshing ? "btn-disabled" : ""}`}
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
                                        <RotateCw className="w-4 h-4" />
                                        Refresh Eligibility
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-accent btn-soft border-accent btn-sm w-full"
                            onClick={() => {
                                if (!isSelfMode) setFilterEmployee(null);
                                setFilterJob(null);
                                setFilterCert(null);
                                setFilterLevel(null);
                                setFilterSub(null);
                                setFilterStatus(null);
                                setFilterSource(null);
                                setPage(1);
                                toast.success("Clear filter berhasil");
                            }}
                        >
                            <Eraser className="w-4 h-4" />
                            Clear Filter
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <Select
                        options={jobOptions}
                        value={filterJob}
                        onChange={setFilterJob}
                        placeholder="Filter Jabatan"
                        isClearable
                    />
                    <Select
                        options={certOptions}
                        value={filterCert}
                        onChange={setFilterCert}
                        placeholder="Filter Sertifikasi"
                        isClearable
                    />
                    <Select
                        options={levelOptions}
                        value={filterLevel}
                        onChange={setFilterLevel}
                        placeholder="Filter Level"
                        isClearable
                    />
                    <Select
                        options={subOptions}
                        value={filterSub}
                        onChange={setFilterSub}
                        placeholder="Filter Sub Bidang"
                        isClearable
                    />
                    <Select
                        options={[
                            { value: "NOT_YET_CERTIFIED", label: "Belum Sertifikasi" },
                            { value: "ACTIVE", label: "Active" },
                            { value: "DUE", label: "Due" },
                            { value: "EXPIRED", label: "Expired" },
                        ]}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        placeholder="Filter Status"
                        isClearable
                    />
                    <Select
                        options={[
                            { value: "BY_JOB", label: "By Job" },
                            { value: "BY_NAME", label: "By Name" },
                        ]}
                        value={filterSource}
                        onChange={setFilterSource}
                        placeholder="Filter Source"
                        isClearable
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
                            <th>Kode Sertifikat</th>
                            <th>No Sertifikat</th>
                            <th>Tgl Sertifikasi</th>
                            <th>Jenjang</th>
                            <th>Sub Bidang</th>
                            <th>SK Efektif</th>
                            <th>Status</th>
                            <th>Due Date</th>
                            <th>Sumber</th>
                            <th>Training</th>
                            <th>Refreshment</th>
                            <th>Perpanjang</th>
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
                                <tr key={r.id ?? `${r.employeeId}-${r.certificationRuleId}`}>
                                    <td>{startIdx + idx}</td>

                                    <td>
                                        <Link
                                            to={`/employee/${r.employeeId}`}
                                            className="btn btn-xs btn-info btn-soft border-info"
                                        >
                                            <Eye className="w-3 h-3" />
                                        </Link>
                                    </td>

                                    <td>{r.nip}</td>
                                    <td>{r.employeeName}</td>
                                    <td>{r.jobPositionTitle}</td>
                                    <td>{r.certificationCode}</td>
                                    <td>{r.certNumber || "-"}</td>
                                    <td>{formatDate(r.certDate)}</td>
                                    <td>{r.certificationLevelLevel ?? "-"}</td>
                                    <td>{r.subFieldCode ?? "-"}</td>
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
    );
}
