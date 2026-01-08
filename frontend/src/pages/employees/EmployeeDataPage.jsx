import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Upload, History, Eraser, Filter, Users } from "lucide-react";
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

export default function EmployeePage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const TABLE_COLS = 11;

    const [filterEmployee, setFilterEmployee] = useState(null);
    const [regionalIds, setRegionalIds] = useState([]);
    const [divisionIds, setDivisionIds] = useState([]);
    const [unitIds, setUnitIds] = useState([]);
    const [jobPositionIds, setJobPositionIds] = useState([]);
    const [statuses, setStatuses] = useState([]);

    const [regionalOptions, setRegionalOptions] = useState([]);
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);
    const [jobOptions, setJobOptions] = useState([]);

    const statusOptions = useMemo(
        () => [
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
        ],
        []
    );

    const [openImport, setOpenImport] = useState(false);

    function formatStatusLabel(status) {
        if (!status) return "-";
        const s = status.toString().toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    useEffect(() => {
        Promise.all([fetchRegionals(), fetchDivisions(), fetchUnits(), fetchJobPositions()])
            .then(([r, d, u, j]) => {
                setRegionalOptions((r || []).map((x) => ({ value: x.id, label: x.name })));
                setDivisionOptions((d || []).map((x) => ({ value: x.id, label: x.name })));
                setUnitOptions((u || []).map((x) => ({ value: x.id, label: x.name })));
                setJobOptions((j || []).map((x) => ({ value: x.id, label: x.name })));
            })
            .catch(() => toast.error("Gagal memuat filter master data"));
    }, []);

    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchEmployees({ search: inputValue, page: 0, size: 20 });
            return (res.content || []).map((e) => ({
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
        toast.success("Filter dibersihkan");
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
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Kelola Pegawai</h1>
                    <p className="text-xs text-gray-500">{totalElements} pegawai terdaftar</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className="btn btn-sm btn-success rounded-lg" onClick={() => setOpenImport(true)}>
                        <Upload size={14} />
                        Import Excel
                    </button>
                    <button className="btn btn-sm btn-secondary rounded-lg" onClick={handleDownloadTemplate}>
                        <Download size={14} />
                        Download Template
                    </button>
                    <button
                        className="btn btn-sm btn-accent rounded-lg"
                        onClick={() => navigate("/employee/data/histories")}
                    >
                        <History size={14} />
                        Histori
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
                            defaultOptions
                            loadOptions={loadEmployees}
                            value={filterEmployee}
                            onChange={setFilterEmployee}
                            placeholder="Filter Pegawai"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Regional
                        </label>
                        <Select
                            isMulti
                            options={regionalOptions}
                            value={regionalIds}
                            onChange={setRegionalIds}
                            placeholder="Filter Regional"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Division
                        </label>
                        <Select
                            isMulti
                            options={divisionOptions}
                            value={divisionIds}
                            onChange={setDivisionIds}
                            placeholder="Filter Division"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Unit
                        </label>
                        <Select
                            isMulti
                            options={unitOptions}
                            value={unitIds}
                            onChange={setUnitIds}
                            placeholder="Filter Unit"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Jabatan
                        </label>
                        <Select
                            isMulti
                            options={jobOptions}
                            value={jobPositionIds}
                            onChange={setJobPositionIds}
                            placeholder="Filter Jabatan"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Status
                        </label>
                        <Select
                            isMulti
                            options={statusOptions}
                            value={statuses}
                            onChange={setStatuses}
                            placeholder="Filter Status"
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-3">
                    <button className="btn btn-sm btn-accent btn-soft rounded-lg flex gap-2" onClick={resetFilter}>
                        <Eraser size={14} />
                        Clear Filter
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead className="bg-base-200 text-xs">
                            <tr>
                                <th className="w-12">No</th>
                                <th>NIP</th>
                                <th>Nama</th>
                                <th className="w-24">Status</th>
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
                                    <td colSpan={TABLE_COLS} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLS} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Users size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data pegawai</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((e, idx) => (
                                    <tr key={e.id} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>{e.nip}</td>
                                        <td className="font-medium">{e.name}</td>
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

            <ImportEmployeeModal open={openImport} onClose={() => setOpenImport(false)} onImported={load} />
        </div>
    );
}
