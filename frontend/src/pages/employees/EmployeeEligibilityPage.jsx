// src/pages/employees/EmployeeEligibilityPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";

import Pagination from "../../components/common/Pagination";
import { fetchEmployeeEligibilityPaged, refreshEmployeeEligibility } from "../../services/employeeEligibilityService";
import { fetchAllJobPositions } from "../../services/jobPositionService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { searchEmployees } from "../../services/employeeService";
import { fetchMyPicScope } from "../../services/picScopeService";

import { Eye, RotateCw, Eraser } from "lucide-react";

const TABLE_COLS = 15;

// ===== helpers role & employee =====
function getCurrentEmployeeId() {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("employeeId");
    if (!raw) return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
}

function getCurrentRole() {
    if (typeof window === "undefined") return "";
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const fromUser = (user.role || "").toString().toUpperCase();
        if (fromUser) return fromUser;
    } catch {
        // ignore
    }
    return (localStorage.getItem("role") || "").toString().toUpperCase();
}

export default function EmployeeEligibilityPage() {
    // ===== role flags =====
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

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // FILTER STATE (single select)
    const [filterEmployee, setFilterEmployee] = useState(null);
    const [filterJob, setFilterJob] = useState(null);
    const [filterCert, setFilterCert] = useState(null);
    const [filterLevel, setFilterLevel] = useState(null);
    const [filterSub, setFilterSub] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterSource, setFilterSource] = useState(null);

    // Master options
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

    function formatStatusLabel(status) {
        if (!status) return "-";
        switch (status) {
            case "NOT_YET_CERTIFIED":
                return "Belum Sertifikasi";
            case "ACTIVE":
                return "Active";
            case "DUE":
                return "Due";
            case "EXPIRED":
                return "Expired";
            default:
                return status;
        }
    }

    function formatSourceLabel(source) {
        if (!source) return "-";
        if (source === "BY_JOB") return "By Job";
        if (source === "BY_NAME") return "By Name";
        return source;
    }

    // ============ LOAD DATA TABLE ============
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

            // khusus PEGAWAI: generate opsi sertifikasi dari data eligibility yang tampil
            if (isSelfMode) {
                const uniqueCodes = Array.from(
                    new Set((res?.content || []).map((r) => r.certificationCode).filter(Boolean))
                );

                setCertOptions(
                    uniqueCodes.map((code) => ({
                        value: code,
                        label: code,
                    }))
                );
            }

            setRows(res?.content || []);
            setTotalPages(res?.totalPages || 1);
            setTotalElements(res?.totalElements || 0);
        } catch (e) {
            console.error("load eligibility error", e);
            toast.error("Gagal memuat eligibility");
        } finally {
            setLoading(false);
        }
    }

    // ============ REFRESH ELIGIBILITY ============
    async function onRefresh() {
        // guard tambahan: PEGAWAI gak boleh refresh
        if (!canRefresh || isSelfMode) return;
        setRefreshing(true);
        try {
            await refreshEmployeeEligibility();
            toast.success("Eligibility berhasil di-refresh");
            await load();
        } catch (e) {
            console.error("refresh eligibility error", e);
            toast.error("Gagal refresh eligibility");
        } finally {
            setRefreshing(false);
        }
    }

    // ============ LOAD MASTER FILTER OPTIONS ============
    async function loadFilters() {
        try {
            const [jobs, levels, subs] = await Promise.all([
                fetchAllJobPositions(),
                fetchCertificationLevels(),
                fetchSubFields(),
            ]);

            setJobOptions((jobs || []).map((j) => ({ value: j.id, label: j.name })));
            setLevelOptions((levels || []).map((l) => ({ value: l.level, label: String(l.level) })));
            setSubOptions((subs || []).map((s) => ({ value: s.code, label: s.code })));

            if (isPic) {
                // PIC → sertifikasi dari scope PIC
                try {
                    const scope = await fetchMyPicScope();
                    const certsFromScope = (scope?.certifications || []).map((s) => ({
                        value: s.certificationCode,
                        label: s.certificationCode,
                    }));
                    setCertOptions(certsFromScope);
                } catch (e) {
                    console.error("load PIC scope error", e);
                    toast.error("Gagal memuat scope sertifikasi PIC");
                    setCertOptions([]);
                }
            } else if (isSuperadmin) {
                // SUPERADMIN → semua sertifikasi dari /certifications
                try {
                    const certs = await fetchCertifications();
                    setCertOptions(
                        (certs || []).map((c) => ({
                            value: c.code,
                            label: c.code,
                        }))
                    );
                } catch (e) {
                    console.error("load certifications error", e);
                    toast.error("Gagal memuat daftar sertifikasi");
                    setCertOptions([]);
                }
            }
            // PEGAWAI → certOptions di-set di fungsi load() dari data eligibility, jadi di sini gak perlu call /certifications
        } catch (err) {
            console.error("loadFilters error:", err);
            toast.error("Gagal memuat filter");
        }
    }

    // Async search employees (untuk filter pegawai SUPERADMIN & PIC)
    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchEmployees({ search: inputValue, page: 0, size: 20 });
            return (res?.content || []).map((e) => ({
                value: e.id,
                label: `${e.nip} - ${e.name}`,
            }));
        } catch {
            return [];
        }
    };

    // load data tiap dependency berubah
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // reset ke page 1 tiap filter berubah
    useEffect(() => {
        setPage(1);
    }, [filterEmployee, filterJob, filterCert, filterLevel, filterSub, filterStatus, filterSource, role]);

    useEffect(() => {
        loadFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    let infoText = "Menampilkan data untuk: Semua pegawai";
    if (isSelfMode) {
        infoText = "Menampilkan data untuk: Anda sendiri";
    } else if (filterEmployee) {
        infoText = `Menampilkan data untuk: ${filterEmployee.label}`;
    } else if (isPic) {
        infoText = "Menampilkan data untuk: Pegawai dalam scope Anda";
    }

    return (
        <div>
            {/* Info siapa yang ditampilkan */}
            <p className="mb-2 text-sm">
                {infoText.split(":")[0]}: <span className="font-semibold">{infoText.split(":")[1]?.trim()}</span>
            </p>

            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                {/* Row 1: Filter pegawai + tombol kanan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="col-span-1">
                        {/* Pegawai biasa tidak boleh ganti employee */}
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

                    {/* spacer biar tombol tetap di kanan */}
                    <div className={showRefreshButton ? "col-span-3" : "col-span-4"} />

                    {/* Tombol Refresh – hanya SUPERADMIN & PIC (bukan PEGAWAI) */}
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

                    {/* Tombol Clear – semua role boleh */}
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

                {/* Row 2: Filters detail */}
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

            {/* Table */}
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

                                    {/* Aksi: tombol detail */}
                                    <td>
                                        <div className="flex gap-2">
                                            <div className="tooltip" data-tip="Lihat detail pegawai">
                                                <Link
                                                    to={`/employee/${r.employeeId}`}
                                                    className="btn btn-xs btn-info btn-soft border-info"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    </td>

                                    <td>{r.nip}</td>
                                    <td>{r.employeeName}</td>
                                    <td>{r.jobPositionTitle}</td>
                                    <td>{r.certificationCode}</td>
                                    <td>{r.certificationLevelLevel ?? "-"}</td>
                                    <td>{r.subFieldCode ?? "-"}</td>
                                    <td>
                                        {r.effectiveDate
                                            ? new Date(r.effectiveDate).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "-"}
                                    </td>
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
                                    <td>
                                        {r.dueDate
                                            ? new Date(r.dueDate).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "-"}
                                    </td>
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
        </div>
    );
}
