import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import EditEmployeeModal from "../../components/employees/EditEmployeeModal";
import ImportEmployeeModal from "../../components/employees/ImportEmployeeModal";

export default function EmployeePage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [filterEmployee, setFilterEmployee] = useState(null);
    const [regionalIds, setRegionalIds] = useState([]);
    const [divisionIds, setDivisionIds] = useState([]);
    const [unitIds, setUnitIds] = useState([]);
    const [jobPositionIds, setJobPositionIds] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [includeResigned, setIncludeResigned] = useState(false);

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
    const [editItem, setEditItem] = useState(null);
    const [openImport, setOpenImport] = useState(false);
    const [confirm, setConfirm] = useState({ open: false, id: null });

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

    // Async search employees (ikut toggle includeResigned)
    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchEmployees({
                search: inputValue,
                page: 0,
                size: 20,
                includeResigned, // 🧠 ikut toggle checkbox
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
                includeResigned,
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
    }, [
        page,
        rowsPerPage,
        filterEmployee,
        regionalIds,
        divisionIds,
        unitIds,
        jobPositionIds,
        statuses,
        includeResigned,
    ]);

    // Reset filter
    function resetFilter() {
        setFilterEmployee(null);
        setRegionalIds([]);
        setDivisionIds([]);
        setUnitIds([]);
        setJobPositionIds([]);
        setStatuses([]);
        setIncludeResigned(false);
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
                    <div className="hidden lg:block col-span-2"></div>
                    <div className="col-span-1">
                        <button className="btn btn-warning btn-sm w-full" onClick={handleDownloadTemplate}>
                            Download Template
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button className="btn btn-success btn-sm w-full" onClick={() => setOpenImport(true)}>
                            Import Excel
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button
                            className="btn btn-sm btn-accent w-full"
                            onClick={() => navigate("/employee/data/histories")}
                        >
                            Histori
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
                            Clear Filter
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-center">
                    <AsyncSelect
                        key={includeResigned ? "withResign" : "noResign"} // 🔥 re-render saat toggle berubah
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

                <div className="flex justify-end mt-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeResigned}
                            onChange={(e) => {
                                setIncludeResigned(e.target.checked);
                                setPage(1);
                            }}
                        />
                        <span className="text-gray-500 select-none">Tampilkan pegawai resign</span>
                    </label>
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
                                <td colSpan={12} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((e, idx) => (
                                <tr key={e.id}>
                                    <td>{startIdx + idx}</td>
                                    <td className="flex gap-2">
                                        <button
                                            className="btn btn-xs btn-warning btn-soft border-warning"
                                            onClick={() => setEditItem(e)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-xs btn-error btn-soft border-error"
                                            onClick={() => setConfirm({ open: true, id: e.id })}
                                        >
                                            Hapus
                                        </button>
                                    </td>
                                    <td>{e.nip}</td>
                                    <td>
                                        <Link to={`/employee/${e.id}`} className="hover:text-secondary underline">
                                            {e.name}
                                        </Link>
                                    </td>
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
                                            {e.status}
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
            <EditEmployeeModal open={!!editItem} initial={editItem} onClose={() => setEditItem(null)} onSaved={load} />
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
