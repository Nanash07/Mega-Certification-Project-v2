import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import {
    fetchEmployeeHistories,
    exportEmployeeHistoriesExcel,
    searchEmployeeOptionsFromHistories,
    fetchDefaultEmployeeOptionsFromHistories,
} from "../../services/employeeHistoryService";
import { ArrowLeft, Download } from "lucide-react";

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
        toast.success("Filter berhasil direset");
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

    const loadEmployeeOptions = useCallback(async (inputValue) => {
        try {
            const q = (inputValue ?? "").trim();

            // default: munculin 10 tanpa search
            if (q.length === 0) {
                return await fetchDefaultEmployeeOptionsFromHistories();
            }

            // biar gak berat: search minimal 3 huruf
            if (q.length < 3) {
                return [];
            }

            return await searchEmployeeOptionsFromHistories(q);
        } catch (err) {
            return [];
        }
    }, []);

    return (
        <div className="p-4 space-y-5">
            <div className="flex justify-start mb-3">
                <button className="btn btn-accent btn-sm flex items-center gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> Kembali
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                <AsyncSelect
                    cacheOptions
                    defaultOptions={true}
                    loadOptions={loadEmployeeOptions}
                    value={filterEmployee}
                    onChange={setFilterEmployee}
                    placeholder="Cari Pegawai"
                    isClearable
                    isSearchable
                    className="text-sm"
                    noOptionsMessage={({ inputValue }) => {
                        const q = (inputValue ?? "").trim();
                        if (q.length === 0) return "Tidak ada data";
                        if (q.length < 3) return "Ketik minimal 3 huruf untuk mencari";
                        return "Tidak ditemukan";
                    }}
                    loadingMessage={() => "Mencari..."}
                />

                <Select
                    options={ACTION_OPTIONS}
                    value={filterAction}
                    onChange={setFilterAction}
                    placeholder="Filter Aksi"
                    className="text-sm"
                />

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Tanggal Mulai</label>
                    <input
                        type="date"
                        className="input input-bordered input-sm w-full"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Tanggal Akhir</label>
                    <input
                        type="date"
                        className="input input-bordered input-sm w-full"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>

                <button
                    className="btn btn-neutral btn-sm w-full flex items-center gap-2"
                    onClick={handleExport}
                    disabled={exporting}
                >
                    {exporting ? (
                        <>
                            <span className="loading loading-spinner loading-sm" />
                            Exporting
                        </>
                    ) : (
                        <>
                            <Download size={16} />
                            Export Excel
                        </>
                    )}
                </button>

                <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
                    Clear Filter
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra text-xs">
                    <thead className="bg-base-200">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
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
                                <td colSpan={14} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={14} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((h, idx) => (
                                <tr key={h.id ?? `${h.employeeId}-${idx}`}>
                                    <td>{startIdx + idx}</td>
                                    <td>
                                        <span className={`badge badge-sm text-white ${badgeClass(h.actionType)}`}>
                                            {h.actionType || "-"}
                                        </span>
                                    </td>
                                    <td>{formatDate(h.actionAt)}</td>
                                    <td>{h.employeeNip || "-"}</td>
                                    <td>{h.employeeName || "-"}</td>
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
