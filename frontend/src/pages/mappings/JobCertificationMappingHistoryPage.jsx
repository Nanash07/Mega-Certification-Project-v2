import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";
import { getCurrentRole } from "../../utils/helpers";
import { fetchJobCertMappingHistories } from "../../services/jobCertificationMappingHistoryService";
import { fetchMyPicScope } from "../../services/picScopeService";
import { ArrowLeft, Eraser, Filter, History as HistoryIcon } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TABLE_COLS = 8;

export default function JobCertificationMappingHistoryPage() {
    const navigate = useNavigate();

    const [role, setRole] = useState(null);
    const isRoleLoaded = role !== null;
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";
    const isPic = role === "PIC";

    const [allowedCertIds, setAllowedCertIds] = useState(null);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [filterAction, setFilterAction] = useState({ value: "all", label: "Semua Aksi" });
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    useEffect(() => {
        setRole(getCurrentRole());
    }, []);

    useEffect(() => {
        if (!isRoleLoaded) return;
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
    }, [isRoleLoaded, isEmployee]);

    useEffect(() => {
        if (!isRoleLoaded) return;
        if (!isPic) {
            setAllowedCertIds(null);
            return;
        }

        const loadScope = async () => {
            try {
                const scope = await fetchMyPicScope();
                const scopeCerts = scope?.certifications || [];
                const ids = scopeCerts.map((c) => c.certificationId).filter((id) => id != null);
                setAllowedCertIds(ids);
            } catch (err) {
                console.error("Gagal load PIC scope:", err);
                toast.error("Gagal memuat scope sertifikasi PIC");
                setAllowedCertIds([]);
            }
        };
        loadScope();
    }, [isRoleLoaded, isPic]);

    const load = useCallback(async () => {
        if (!isRoleLoaded || isEmployee) return;
        if (isPic && allowedCertIds === null) return;

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

            if (isPic && Array.isArray(allowedCertIds) && allowedCertIds.length > 0) {
                params.allowedCertificationIds = allowedCertIds;
            }

            const data = await fetchJobCertMappingHistories(params);
            setRows(data.content || []);
            setTotalPages(data.totalPages || 1);
            setTotalElements(data.totalElements || 0);
        } catch (err) {
            console.error("Gagal load history mapping:", err);
            toast.error("Gagal memuat histori mapping jabatan");
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterAction, startDate, endDate, isRoleLoaded, isEmployee, isPic, allowedCertIds]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        setPage(1);
    }, [filterAction, startDate, endDate]);

    const resetFilter = () => {
        setFilterAction({ value: "all", label: "Semua Aksi" });
        setStartDate(null);
        setEndDate(null);
        setPage(1);
        toast.success("Filter dibersihkan");
    };

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

    if (!isRoleLoaded || isEmployee) return null;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold">Histori Mapping Jabatan</h1>
                        <p className="text-xs text-gray-500">{totalElements} riwayat perubahan</p>
                    </div>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Aksi
                        </label>
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
                            placeholder="Semua Aksi"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Dari Tanggal
                        </label>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            className="input input-bordered input-sm w-full rounded-lg"
                            placeholderText="Dari Tanggal"
                            dateFormat="dd MMM yyyy"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Sampai Tanggal
                        </label>
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            className="input input-bordered input-sm w-full rounded-lg"
                            placeholderText="Sampai Tanggal"
                            dateFormat="dd MMM yyyy"
                        />
                    </div>
                    <div className="lg:col-span-1"></div>
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
                                <th>Aksi</th>
                                <th>Tanggal Aksi</th>
                                <th>Job</th>
                                <th>Cert Code</th>
                                <th>Level</th>
                                <th>Sub Field</th>
                                <th>Status</th>
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
                                            <HistoryIcon size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data histori</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id || idx} className="hover">
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
                                        <td className="text-gray-500">{formatDate(r.actionAt, true)}</td>
                                        <td className="font-medium">{r.jobName || "-"}</td>
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
