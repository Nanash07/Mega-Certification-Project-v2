import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";
import { fetchEmployeeHistories } from "../../services/employeeHistoryService";
import { ArrowLeft } from "lucide-react";

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

    // data
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // filters
    const [filterEmployee, setFilterEmployee] = useState(null); // {value,label}
    const [filterAction, setFilterAction] = useState(ACTION_OPTIONS[0]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // options pegawai (react-select biasa)
    const [employeeOptions, setEmployeeOptions] = useState([]);

    const startIdx = useMemo(
        () => (totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1),
        [totalElements, page, rowsPerPage]
    );

    const formatDate = (val) => {
        if (!val) return "-";
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // ====== Load list pegawai (simple, seperti sebelumnya) ======
    // NOTE: Ini masih fallback dari histories. Kalau mau lengkap, idealnya endpoint employees/options.
    const loadEmployeeList = useCallback(async () => {
        try {
            const data = await fetchEmployeeHistories({ page: 0, size: 2000 });

            const unique = new Map();
            data.content.forEach((h) => {
                if (h?.employeeId && !unique.has(h.employeeId)) {
                    unique.set(h.employeeId, {
                        value: h.employeeId,
                        label: `${h.employeeNip || "-"} - ${h.employeeName || "-"}`,
                    });
                }
            });

            // sort biar enak dicari di dropdown
            const opts = Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));

            setEmployeeOptions(opts);
        } catch (err) {
            console.error("❌ Gagal load list pegawai:", err);
        }
    }, []);

    useEffect(() => {
        loadEmployeeList();
    }, [loadEmployeeList]);

    // ====== Reset page kalau filter berubah (biar filter gak “kayak ga jalan”) ======
    useEffect(() => {
        setPage(1);
    }, [filterEmployee, filterAction, startDate, endDate]);

    // ====== Load histories ======
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

    return (
        <div className="p-4 space-y-5">
            {/* Back button */}
            <div className="flex justify-start mb-3">
                <button className="btn btn-accent btn-sm flex items-center gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> Kembali
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                {/* Pegawai (react-select biasa) */}
                <Select
                    options={employeeOptions}
                    value={filterEmployee}
                    onChange={setFilterEmployee}
                    placeholder="Filter Pegawai"
                    isClearable
                    isSearchable
                    className="text-sm"
                />

                {/* Aksi */}
                <Select
                    options={ACTION_OPTIONS}
                    value={filterAction}
                    onChange={setFilterAction}
                    placeholder="Filter Aksi"
                    className="text-sm"
                />

                {/* Start Date */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Tanggal Mulai</label>
                    <input
                        type="date"
                        className="input input-bordered input-sm w-full"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                {/* End Date */}
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

                {/* Export */}
                <button className="btn btn-warning btn-sm w-full" onClick={() => toast("📥 Coming Soon: Export Excel")}>
                    Export Excel
                </button>

                {/* Clear Filter */}
                <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
                    Clear Filter
                </button>
            </div>

            {/* Table */}
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
                            <th>Unit</th>
                            <th>Divisi</th>
                            <th>Regional</th>
                            <th>Tanggal Efektif</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={11} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="text-center text-gray-400 py-10">
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
                                    <td>{h.newUnitName || "-"}</td>
                                    <td>{h.newDivisionName || "-"}</td>
                                    <td>{h.newRegionalName || "-"}</td>
                                    <td>{formatDate(h.effectiveDate)}</td>
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
