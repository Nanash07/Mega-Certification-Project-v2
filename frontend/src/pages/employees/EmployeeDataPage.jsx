import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Download, Upload, History, Eraser } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import {
    fetchEmployees,
    deleteEmployee,
    downloadEmployeeTemplate,
    fetchRegionals,
    fetchDivisions,
    fetchUnits,
    fetchJobPositions,
    searchEmployees,
} from "../../services/employeeService";
import ImportEmployeeModal from "../../components/employees/ImportEmployeeModal";
import { Eye, Pencil, Trash2 } from "lucide-react";

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
    const statusOptions = [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
        { value: "RESIGN", label: "Resign" },
    ];

    // Modals
    const [openImport, setOpenImport] = useState(false);
    const [confirm, setConfirm] = useState({ open: false, id: null });

    // Helper: format status -> kapital depan doang
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

    // Async search employees (tanpa toggle resign lagi)
    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchEmployees({
                search: inputValue,
                page: 0,
                size: 20,
            });
            return res.content.map((e) => ({
                value: e.id,
                label: `${e.nip} - ${e.name}${e.status === "RESIGN" ? " (Resign)" : ""}`,
            }));
        } catch {
            return [];
        }
    };

    // Load employees
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
    }, [page, rowsPerPage, filterEmployee, regionalIds, divisionIds, unitIds, jobPositionIds, statuses]);

    // Reset filter
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

    // Confirm delete
    async function handleDelete(id) {
        try {
            await deleteEmployee(id);
            toast.success("Pegawai berhasil dihapus");
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal menghapus pegawai");
        } finally {
            setConfirm({ open: false, id: null });
        }
    }

    // Download template
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

                                    {/* Aksi: detail, hapus pakai icon + tooltip */}
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

                                            {/* Hapus */}
                                            <div className="tooltip" data-tip="Hapus pegawai dari sistem">
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-error btn-soft border-error"
                                                    onClick={() => setConfirm({ open: true, id: e.id })}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    <td>{e.nip}</td>
                                    {/* Nama: teks biasa */}
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

            {/* Confirm Delete Modal */}
            <dialog className="modal" open={confirm.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Hapus Pegawai?</h3>
                    <p className="py-2">Pegawai ini akan dihapus dari sistem.</p>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setConfirm({ open: false, id: null })}>
                            Batal
                        </button>
                        <button className="btn btn-error" onClick={() => handleDelete(confirm.id)}>
                            Hapus
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setConfirm({ open: false, id: null })}>close</button>
                </form>
            </dialog>
        </div>
    );
}
