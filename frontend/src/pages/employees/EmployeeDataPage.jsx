import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Download, Upload, History, Eraser } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import {
    fetchEmployees,
    softDeleteEmployee,
    resignEmployee,
    downloadEmployeeTemplate,
    fetchRegionals,
    fetchDivisions,
    fetchUnits,
    fetchJobPositions,
    searchEmployees,
} from "../../services/employeeService";
import ImportEmployeeModal from "../../components/employees/ImportEmployeeModal";
import { Eye, Trash2, UserX } from "lucide-react";

export default function EmployeePage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const TABLE_COLS = 12;

    // Filters
    const [filterEmployee, setFilterEmployee] = useState(null);
    const [regionalIds, setRegionalIds] = useState([]);
    const [divisionIds, setDivisionIds] = useState([]);
    const [unitIds, setUnitIds] = useState([]);
    const [jobPositionIds, setJobPositionIds] = useState([]);
    const [statuses, setStatuses] = useState([]);

    // Master options
    const [regionalOptions, setRegionalOptions] = useState([]);
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);
    const [jobOptions, setJobOptions] = useState([]);

    // Active page: jangan tampilkan RESIGN
    const statusOptions = useMemo(
        () => [
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            // no RESIGN here
        ],
        []
    );

    // Modals
    const [openImport, setOpenImport] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
    const [confirmResign, setConfirmResign] = useState({ open: false, id: null });

    function formatStatusLabel(status) {
        if (!status) return "-";
        const s = status.toString().toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // Load master data
    useEffect(() => {
        Promise.all([fetchRegionals(), fetchDivisions(), fetchUnits(), fetchJobPositions()])
            .then(([r, d, u, j]) => {
                setRegionalOptions(r.map((x) => ({ value: x.id, label: x.name })));
                setDivisionOptions(d.map((x) => ({ value: x.id, label: x.name })));
                setUnitOptions(u.map((x) => ({ value: x.id, label: x.name })));
                setJobOptions(j.map((x) => ({ value: x.id, label: x.name })));
            })
            .catch(() => toast.error("Gagal memuat filter master data"));
    }, []);

    // Async search employees (active endpoint already excludes resign)
    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchEmployees({ search: inputValue, page: 0, size: 20 });
            return res.content.map((e) => ({
                value: e.id,
                label: `${e.nip} - ${e.name}`,
            }));
        } catch {
            return [];
        }
    };

    async function load() {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                employeeIds: filterEmployee ? [filterEmployee.value] : [],
                regionalIds: regionalIds.map((i) => i.value),
                divisionIds: divisionIds.map((i) => i.value),
                unitIds: unitIds.map((i) => i.value),
                jobPositionIds: jobPositionIds.map((i) => i.value),
                statuses: statuses.map((i) => i.value),
            };

            const res = await fetchEmployees(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("Gagal memuat data pegawai");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, filterEmployee, regionalIds, divisionIds, unitIds, jobPositionIds, statuses]);

    function resetFilter() {
        setFilterEmployee(null);
        setRegionalIds([]);
        setDivisionIds([]);
        setUnitIds([]);
        setJobPositionIds([]);
        setStatuses([]);
        setPage(1);
        toast.success("Clear filter berhasil");
    }

    async function handleSoftDelete(id) {
        try {
            await softDeleteEmployee(id);
            toast.success("Pegawai berhasil dihapus dari sistem");
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal menghapus pegawai");
        } finally {
            setConfirmDelete({ open: false, id: null });
        }
    }

    async function handleResign(id) {
        try {
            await resignEmployee(id);
            toast.success("Pegawai berhasil di-resign");
            load(); // akan otomatis hilang dari active page
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal resign pegawai");
        } finally {
            setConfirmResign({ open: false, id: null });
        }
    }

    async function handleDownloadTemplate() {
        try {
            const blob = await downloadEmployeeTemplate();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "employee_template.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Template berhasil diunduh");
        } catch {
            toast.error("Gagal download template");
        }
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="col-span-1">
                        <button className="btn btn-success btn-sm w-full" onClick={() => setOpenImport(true)}>
                            <Upload className="w-4 h-4" />
                            Import Excel
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button className="btn btn-secondary btn-sm w-full" onClick={handleDownloadTemplate}>
                            <Download className="w-4 h-4" />
                            Download Template
                        </button>
                    </div>
                    <div className="hidden lg:block col-span-2"></div>
                    <div className="col-span-1">
                        <button
                            className="btn btn-sm btn-accent w-full"
                            onClick={() => navigate("/employee/data/histories")}
                        >
                            <History className="w-4 h-4" />
                            Histori
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
                            <Eraser className="w-4 h-4" />
                            Clear Filter
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-center">
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
                        options={regionalOptions}
                        value={regionalIds}
                        onChange={setRegionalIds}
                        placeholder="Filter Regional"
                    />
                    <Select
                        isMulti
                        options={divisionOptions}
                        value={divisionIds}
                        onChange={setDivisionIds}
                        placeholder="Filter Division"
                    />
                    <Select
                        isMulti
                        options={unitOptions}
                        value={unitIds}
                        onChange={setUnitIds}
                        placeholder="Filter Unit"
                    />
                    <Select
                        isMulti
                        options={jobOptions}
                        value={jobPositionIds}
                        onChange={setJobPositionIds}
                        placeholder="Filter Jabatan"
                    />
                    <Select
                        isMulti
                        options={statusOptions}
                        value={statuses}
                        onChange={setStatuses}
                        placeholder="Filter Status"
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
                            <th>Nama</th>
                            <th>Status</th>
                            <th>Email</th>
                            <th>Gender</th>
                            <th>Regional</th>
                            <th>Division</th>
                            <th>Unit</th>
                            <th>Jabatan</th>
                            <th>SK Efektif</th>
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
                            rows.map((e, idx) => (
                                <tr key={e.id}>
                                    <td>{startIdx + idx}</td>

                                    <td>
                                        <div className="flex gap-2">
                                            {/* Detail */}
                                            <div className="tooltip" data-tip="Lihat detail pegawai">
                                                <Link
                                                    to={`/employee/${e.id}`}
                                                    className="btn btn-xs btn-info btn-soft border-info"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Link>
                                            </div>

                                            {/* Resign (optional, biar pindah ke halaman resign) */}
                                            <div className="tooltip" data-tip="Tandai pegawai resign">
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-warning btn-soft border-warning"
                                                    onClick={() => setConfirmResign({ open: true, id: e.id })}
                                                >
                                                    <UserX className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Hapus dari sistem */}
                                            <div className="tooltip" data-tip="Hapus pegawai dari sistem">
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-error btn-soft border-error"
                                                    onClick={() => setConfirmDelete({ open: true, id: e.id })}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    <td>{e.nip}</td>
                                    <td>{e.name}</td>

                                    <td>
                                        <span
                                            className={`badge badge-sm text-white ${
                                                e.status === "ACTIVE"
                                                    ? "badge-success"
                                                    : e.status === "INACTIVE"
                                                    ? "badge-neutral"
                                                    : e.status === "RESIGN"
                                                    ? "badge-error"
                                                    : "badge-ghost"
                                            }`}
                                        >
                                            {formatStatusLabel(e.status)}
                                        </span>
                                    </td>
                                    <td>{e.email}</td>
                                    <td>{e.gender}</td>
                                    <td>{e.regionalName || "-"}</td>
                                    <td>{e.divisionName || "-"}</td>
                                    <td>{e.unitName || "-"}</td>
                                    <td>{e.jobName || "-"}</td>
                                    <td>
                                        {e.effectiveDate
                                            ? new Date(e.effectiveDate)
                                                  .toLocaleDateString("id-ID", {
                                                      day: "2-digit",
                                                      month: "short",
                                                      year: "numeric",
                                                  })
                                                  .replace(/\./g, "")
                                                  .replace(/(\b[a-z])/g, (x) => x.toUpperCase())
                                            : "-"}
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

            {/* Modals */}
            <ImportEmployeeModal open={openImport} onClose={() => setOpenImport(false)} onImported={load} />

            {/* Confirm Resign Modal */}
            <dialog className="modal" open={confirmResign.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Resign Pegawai?</h3>
                    <p className="py-2">Pegawai ini akan dipindahkan ke daftar resign.</p>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setConfirmResign({ open: false, id: null })}>
                            Batal
                        </button>
                        <button className="btn btn-warning" onClick={() => handleResign(confirmResign.id)}>
                            Resign
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setConfirmResign({ open: false, id: null })}>close</button>
                </form>
            </dialog>

            {/* Confirm Delete Modal */}
            <dialog className="modal" open={confirmDelete.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Hapus Pegawai?</h3>
                    <p className="py-2">Pegawai ini akan dihapus dari sistem (soft delete).</p>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setConfirmDelete({ open: false, id: null })}>
                            Batal
                        </button>
                        <button className="btn btn-error" onClick={() => handleSoftDelete(confirmDelete.id)}>
                            Hapus
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setConfirmDelete({ open: false, id: null })}>close</button>
                </form>
            </dialog>
        </div>
    );
}
