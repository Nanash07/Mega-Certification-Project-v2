// src/pages/job-certification-mapping/JobCertificationMappingHistoryPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";
import { fetchJobCertMappingHistories } from "../../services/jobCertificationMappingHistoryService";
import { fetchMyPicScope } from "../../services/picScopeService";
import { ArrowLeft } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// ===== helper role dari localStorage (sama pattern dengan page lain) =====
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

const TABLE_COLS = 8;

export default function JobCertificationMappingHistoryPage() {
    const navigate = useNavigate();

    // ===== role state (load dulu, baru dipakai) =====
    const [role, setRole] = useState(null);
    const isRoleLoaded = role !== null;
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";
    const isPic = role === "PIC";
    const isSuperadmin = role === "SUPERADMIN";

    // PIC scope: list certificationId yang boleh dilihat
    const [allowedCertIds, setAllowedCertIds] = useState(null); // null = belum ke-load, [] = kosong

    // State data
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [filterAction, setFilterAction] = useState({ value: "all", label: "Semua Aksi" });
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    // ===== INIT ROLE =====
    useEffect(() => {
        setRole(getCurrentRole());
    }, []);

    // ===== Redirect kalau PEGAWAI =====
    useEffect(() => {
        if (!isRoleLoaded) return;
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRoleLoaded, isEmployee]);

    // ===== Load PIC scope =====
    useEffect(() => {
        // cuma PIC yang perlu scope
        if (!isRoleLoaded) return;
        if (!isPic) {
            setAllowedCertIds(null); // superadmin / role lain: ga kirim param, lihat semua
            return;
        }

        const loadScope = async () => {
            try {
                const scope = await fetchMyPicScope();
                const scopeCerts = scope?.certifications || [];
                const ids = scopeCerts.map((c) => c.certificationId).filter((id) => id != null);

                setAllowedCertIds(ids);
            } catch (err) {
                console.error("❌ Gagal load PIC scope:", err);
                toast.error("Gagal memuat scope sertifikasi PIC");
                setAllowedCertIds([]); // fail-safe
            }
        };

        loadScope();
    }, [isRoleLoaded, isPic]);

    // ===== Fetch data =====
    const load = useCallback(async () => {
        // Kalau role belum kebaca, atau lagi redirect pegawai → jangan load
        if (!isRoleLoaded || isEmployee) return;

        // PIC: tunggu scope ke-load dulu
        if (isPic && allowedCertIds === null) return;

        // Validasi tanggal
        if (startDate && endDate && startDate > endDate) {
            toast.error("Tanggal awal tidak boleh lebih besar dari tanggal akhir");
            return;
        }

        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                actionType: filterAction?.value || "all",
                start: startDate ? startDate.toISOString() : null,
                end: endDate ? endDate.toISOString() : null,
            };

            // PIC: kirim allowedCertificationIds ke backend
            if (isPic && Array.isArray(allowedCertIds) && allowedCertIds.length > 0) {
                params.allowedCertificationIds = allowedCertIds;
            }

            const data = await fetchJobCertMappingHistories(params);
            setRows(data.content || []);
            setTotalPages(data.totalPages || 1);
            setTotalElements(data.totalElements || 0);
        } catch (err) {
            console.error("❌ Gagal load history mapping:", err);
            toast.error("❌ Gagal memuat histori mapping jabatan");
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterAction, startDate, endDate, isRoleLoaded, isEmployee, isPic, allowedCertIds]);

    // Auto reload when filters/pagination/role/scope change
    useEffect(() => {
        load();
    }, [load]);

    // Reset page when filter changes
    useEffect(() => {
        setPage(1);
    }, [filterAction, startDate, endDate]);

    // Reset filter
    const resetFilter = () => {
        setFilterAction({ value: "all", label: "Semua Aksi" });
        setStartDate(null);
        setEndDate(null);
        setPage(1);
        toast.success("✅ Filter direset");
    };

    const formatDate = (val, withTime = true) => {
        if (!val) return "-";
        return new Date(val).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            ...(withTime && { hour: "2-digit", minute: "2-digit" }),
        });
    };

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    // Selama role belum kebaca, atau user pegawai (lagi redirect) → jangan render apa-apa
    if (!isRoleLoaded || isEmployee) {
        return null;
    }

    return (
        <div className="p-4 space-y-5">
            {/* Back button */}
            <div className="flex justify-start mb-3">
                <button className="btn btn-accent btn-sm flex items-center gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> Kembali
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-center">
                {/* Aksi */}
                <div className="col-span-2">
                    <Select
                        options={[
                            { value: "all", label: "Semua Aksi" },
                            { value: "CREATED", label: "CREATED" },
                            { value: "UPDATED", label: "UPDATED" },
                            { value: "TOGGLED", label: "TOGGLED" },
                            { value: "DELETED", label: "DELETED" },
                        ]}
                        value={filterAction}
                        onChange={(opt) => setFilterAction(opt || { value: "all", label: "Semua Aksi" })}
                        placeholder="Filter Aksi"
                        isClearable
                    />
                </div>

                {/* Date Range */}
                <div className="col-span-2 grid grid-cols-2 gap-2">
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        className="input input-bordered input-sm w-full"
                        placeholderText="Dari Tanggal"
                        dateFormat="dd MMM yyyy"
                    />
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        className="input input-bordered input-sm w-full"
                        placeholderText="Sampai Tanggal"
                        dateFormat="dd MMM yyyy"
                    />
                </div>

                {/* Export */}
                <div className="col-span-1">
                    <button
                        className="btn btn-warning btn-sm w-full"
                        type="button"
                        onClick={() => toast("📥 Coming Soon: Export Excel")}
                    >
                        Export Excel
                    </button>
                </div>

                {/* Clear Filter */}
                <div className="col-span-1">
                    <button
                        className="btn btn-accent btn-soft border-accent btn-sm w-full"
                        type="button"
                        onClick={resetFilter}
                    >
                        Clear Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra text-xs">
                    <thead className="bg-base-200">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>Tanggal Aksi</th>
                            <th>Job</th>
                            <th>Cert Code</th>
                            <th>Level</th>
                            <th>Sub Field</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
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
                                <tr key={r.id || idx}>
                                    <td>{startIdx + idx}</td>
                                    <td>
                                        <span
                                            className={`badge badge-sm text-white ${
                                                r.actionType === "CREATED"
                                                    ? "badge-success"
                                                    : r.actionType === "UPDATED"
                                                    ? "badge-info"
                                                    : r.actionType === "TOGGLED"
                                                    ? "badge-warning"
                                                    : "badge-error"
                                            }`}
                                        >
                                            {r.actionType}
                                        </span>
                                    </td>
                                    <td>{formatDate(r.actionAt, true)}</td>
                                    <td>{r.jobName || "-"}</td>
                                    <td>{r.certificationCode || "-"}</td>
                                    <td>{r.certificationLevel || "-"}</td>
                                    <td>{r.subFieldCode || "-"}</td>
                                    <td>
                                        <span
                                            className={`badge badge-sm text-white ${
                                                r.isActive ? "badge-success" : "badge-error"
                                            }`}
                                        >
                                            {r.isActive ? "ACTIVE" : "INACTIVE"}
                                        </span>
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
        </div>
    );
}
