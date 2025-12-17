import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eraser, Eye } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import {
    fetchResignedEmployees,
    fetchRegionals,
    fetchDivisions,
    fetchUnits,
    fetchJobPositions,
    searchResignedEmployees,
} from "../../services/employeeService";

export default function EmployeeResignedPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const TABLE_COLS = 12;

    const [filterEmployee, setFilterEmployee] = useState(null);
    const [regionalIds, setRegionalIds] = useState([]);
    const [divisionIds, setDivisionIds] = useState([]);
    const [unitIds, setUnitIds] = useState([]);
    const [jobPositionIds, setJobPositionIds] = useState([]);

    const [regionalOptions, setRegionalOptions] = useState([]);
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);
    const [jobOptions, setJobOptions] = useState([]);

    function formatStatusLabel(status) {
        if (!status) return "-";
        const s = status.toString().toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

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

    const loadEmployees = async (inputValue) => {
        try {
            const res = await searchResignedEmployees({ search: inputValue, page: 0, size: 20 });
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
                // statuses removed: resigned endpoint already fixed
            };

            const res = await fetchResignedEmployees(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("Gagal memuat data pegawai resign");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, filterEmployee, regionalIds, divisionIds, unitIds, jobPositionIds]);

    function resetFilter() {
        setFilterEmployee(null);
        setRegionalIds([]);
        setDivisionIds([]);
        setUnitIds([]);
        setJobPositionIds([]);
        setPage(1);
        toast.success("Clear filter berhasil");
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div>
            <div className="mb-4 space-y-3">
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
                    <div className="col-span-1 lg:col-span-1">
                        <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
                            <Eraser className="w-4 h-4" />
                            Clear Filter
                        </button>
                    </div>
                </div>
            </div>

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
                                            <div className="tooltip" data-tip="Lihat detail pegawai">
                                                <Link
                                                    to={`/employee/${e.id}`}
                                                    className="btn btn-xs btn-info btn-soft border-info"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    </td>

                                    <td>{e.nip}</td>
                                    <td>{e.name}</td>

                                    <td>
                                        <span className="badge badge-sm text-white badge-error">
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
