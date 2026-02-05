import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import { getCurrentRole } from "../../utils/helpers";
import {
    fetchEmployeeHistories,
    exportEmployeeHistoriesExcel,
    searchEmployeeOptionsFromHistories,
    fetchDefaultEmployeeOptionsFromHistories,
} from "../../services/employeeHistoryService";
import { ArrowLeft, Download, Filter, Eraser, History as HistoryIcon } from "lucide-react";

const ACTION_OPTIONS = [
    { value: "all", label: "Semua Aksi" },
    { value: "CREATED", label: "CREATED" },
    { value: "UPDATED", label: "UPDATED" },
    { value: "MUTASI", label: "MUTASI" },
    { value: "REHIRED", label: "REHIRED" },
    { value: "RESIGN", label: "RESIGN" },
    { value: "TERMINATED", label: "TERMINATED" },
];

const badgeClass = (actionType) => {
    switch (actionType) {
        case "CREATED":
            return "badge-success";
        case "UPDATED":
            return "badge-info";
        case "MUTASI":
            return "badge-warning";
        case "REHIRED":
            return "badge-primary";
        case "RESIGN":
            return "badge-neutral";
        case "TERMINATED":
            return "badge-error";
        default:
            return "badge-ghost";
    }
};

export default function EmployeeHistoryPage() {
    const navigate = useNavigate();

    const [role, setRole] = useState(null);
    const isRoleLoaded = role !== null;
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

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

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [filterEmployee, setFilterEmployee] = useState(null);
    const [filterAction, setFilterAction] = useState(ACTION_OPTIONS[0]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const startIdx = useMemo(
        () => (totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1),
        [totalElements, page, rowsPerPage]
    );

    const formatDate = (val) => {
        if (!val) return "-";
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    useEffect(() => {
        setPage(1);
    }, [filterEmployee, filterAction, startDate, endDate]);

    const load = useCallback(async () => {
        if (!isRoleLoaded || isEmployee) return;

        setLoading(true);
        try {
            if (startDate && endDate && startDate > endDate) {
                toast.error("Tanggal awal tidak boleh melebihi tanggal akhir");
                return;
            }

            const params = {
                page: page - 1,
                size: rowsPerPage,
                actionType: filterAction?.value || "all",
                employeeId: filterEmployee?.value ?? null,
                startDate,
                endDate,
            };

            const data = await fetchEmployeeHistories(params);
            setRows(data.content || []);
            setTotalPages(data.totalPages || 0);
            setTotalElements(data.totalElements || 0);
        } catch (err) {
            toast.error("Gagal memuat histori pegawai");
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterEmployee, filterAction, startDate, endDate]);

    useEffect(() => {
        load();
    }, [load]);

    const resetFilter = () => {
        setFilterEmployee(null);
        setFilterAction(ACTION_OPTIONS[0]);
        setStartDate("");
        setEndDate("");
        setPage(1);
        toast.success("Filter dibersihkan");
    };

    const handleExport = async () => {
        try {
            if (startDate && endDate && startDate > endDate) {
                toast.error("Tanggal awal tidak boleh melebihi tanggal akhir");
                return;
            }

            setExporting(true);

            await exportEmployeeHistoriesExcel({
                actionType: filterAction?.value || "all",
                employeeId: filterEmployee?.value ?? null,
                startDate,
                endDate,
            });

            toast.success("Export Excel berhasil");
        } catch (err) {
            toast.error("Gagal export Excel");
        } finally {
            setExporting(false);
        }
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

    const loadEmployeeOptions = useCallback(async (inputValue) => {
        try {
            const q = (inputValue ?? "").trim();

            if (q.length === 0) {
                return await fetchDefaultEmployeeOptionsFromHistories();
            }

            if (q.length < 3) {
                return [];
            }

            return await searchEmployeeOptionsFromHistories(q);
        } catch (err) {
            return [];
        }
    }, []);

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
                        <h1 className="text-lg sm:text-xl font-bold">Histori Pegawai</h1>
                        <p className="text-xs text-gray-500">{totalElements} riwayat perubahan</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="btn btn-sm btn-neutral rounded-lg"
                        onClick={handleExport}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Pegawai
                        </label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions={true}
                            loadOptions={loadEmployeeOptions}
                            value={filterEmployee}
                            onChange={setFilterEmployee}
                            placeholder="Cari Pegawai"
                            isClearable
                            isSearchable
                            className="text-xs"
                            classNamePrefix="react-select"
                            noOptionsMessage={({ inputValue }) => {
                                const q = (inputValue ?? "").trim();
                                if (q.length === 0) return "Tidak ada data";
                                if (q.length < 3) return "Ketik minimal 3 huruf untuk mencari";
                                return "Tidak ditemukan";
                            }}
                            loadingMessage={() => "Mencari..."}
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Jenis Aksi
                        </label>
                        <Select
                            options={ACTION_OPTIONS}
                            value={filterAction}
                            onChange={setFilterAction}
                            placeholder="Filter Aksi"
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Tanggal Mulai</label>
                        <input
                            type="date"
                            className="input input-bordered input-sm w-full rounded-lg"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600">Tanggal Akhir</label>
                        <input
                            type="date"
                            className="input input-bordered input-sm w-full rounded-lg"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <button className="btn btn-sm btn-accent btn-soft rounded-lg flex gap-2" onClick={resetFilter}>
                            <Eraser size={14} />
                            Clear Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra text-xs w-full">
                        <thead className="bg-base-200">
                            <tr>
                                <th className="w-12">No</th>
                                <th className="w-24">Aksi</th>
                                <th>Tanggal Aksi</th>
                                <th>NIP</th>
                                <th>Nama Pegawai</th>
                                <th>Jabatan Lama</th>
                                <th>Jabatan Baru</th>
                                <th>Unit Lama</th>
                                <th>Unit Baru</th>
                                <th>Divisi Lama</th>
                                <th>Divisi Baru</th>
                                <th>Regional Lama</th>
                                <th>Regional Baru</th>
                                <th>Tanggal Efektif</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={14} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <HistoryIcon size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data histori</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((h, idx) => (
                                    <tr key={h.id ?? `${h.employeeId}-${idx}`} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>
                                            <span className={`badge badge-sm text-white ${badgeClass(h.actionType)}`}>
                                                {h.actionType || "-"}
                                            </span>
                                        </td>
                                        <td>{formatDate(h.actionAt)}</td>
                                        <td>{h.employeeNip || "-"}</td>
                                        <td className="font-medium">{h.employeeName || "-"}</td>
                                        <td>{h.oldJobTitle || "-"}</td>
                                        <td>{h.newJobTitle || "-"}</td>
                                        <td>{h.oldUnitName || "-"}</td>
                                        <td>{h.newUnitName || "-"}</td>
                                        <td>{h.oldDivisionName || "-"}</td>
                                        <td>{h.newDivisionName || "-"}</td>
                                        <td>{h.oldRegionalName || "-"}</td>
                                        <td>{h.newRegionalName || "-"}</td>
                                        <td>{formatDate(h.effectiveDate)}</td>
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
