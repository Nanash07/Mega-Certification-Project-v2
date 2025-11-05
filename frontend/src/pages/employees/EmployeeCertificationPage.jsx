import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";

import { fetchCertifications, deleteCertification } from "../../services/employeeCertificationService";
import { searchEmployees } from "../../services/employeeService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchInstitutions } from "../../services/institutionService";

import CreateEmployeeCertificationModal from "../../components/employee-certifications/CreateEmployeeCertificationModal";
import EditEmployeeCertificationModal from "../../components/employee-certifications/EditEmployeeCertificationModal";
import UploadEmployeeCertificationModal from "../../components/employee-certifications/UploadEmployeeCertificationModal";
import ViewEmployeeCertificationModal from "../../components/employee-certifications/ViewEmployeeCertificationModal";

export default function EmployeeCertificationPage() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [institutionOptions, setInstitutionOptions] = useState([]);
    const [certCodeOptions, setCertCodeOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subFieldOptions, setSubFieldOptions] = useState([]);

    const [filterEmployee, setFilterEmployee] = useState(null);
    const [filterCertCode, setFilterCertCode] = useState([]);
    const [filterLevel, setFilterLevel] = useState([]);
    const [filterSubField, setFilterSubField] = useState([]);
    const [filterInstitution, setFilterInstitution] = useState([]);
    const [filterStatus, setFilterStatus] = useState([]);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [uploadData, setUploadData] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null });
    const [viewData, setViewData] = useState(null);

    // Load data
    async function load() {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                employeeIds: filterEmployee ? [filterEmployee.value] : [],
                certCodes: filterCertCode.map((f) => f.value),
                levels: filterLevel.map((f) => f.value),
                subCodes: filterSubField.map((f) => f.value),
                institutionIds: filterInstitution.map((f) => f.value),
                statuses: filterStatus.map((f) => f.value),
            };

            const res = await fetchCertifications(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("Gagal memuat sertifikasi pegawai");
        } finally {
            setLoading(false);
        }
    }

    // Load filter options
    async function loadFilters() {
        try {
            const [rules, insts] = await Promise.all([fetchCertificationRules(), fetchInstitutions()]);

            const certCodeOpts = [...new Set(rules.map((r) => r.certificationCode).filter(Boolean))]
                .sort()
                .map((code) => ({ value: code, label: code }));

            const levelOpts = [...new Set(rules.map((r) => r.certificationLevelLevel).filter(Boolean))]
                .sort((a, b) => a - b)
                .map((lvl) => ({ value: lvl, label: lvl }));

            const subFieldOpts = [...new Set(rules.map((r) => r.subFieldCode).filter(Boolean))]
                .sort()
                .map((sf) => ({ value: sf, label: sf }));

            setCertCodeOptions(certCodeOpts);
            setLevelOptions(levelOpts);
            setSubFieldOptions(subFieldOpts);
            setInstitutionOptions(insts.map((i) => ({ value: i.id, label: i.name })));
        } catch {
            toast.error("Gagal memuat filter");
        }
    }

    // Async search employees
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

    async function onDelete(id) {
        try {
            await deleteCertification(id);
            toast.success("Sertifikasi pegawai dihapus");
            load();
        } catch {
            toast.error("Gagal hapus sertifikasi");
        }
    }

    useEffect(() => {
        load();
    }, [
        page,
        rowsPerPage,
        filterEmployee,
        filterCertCode,
        filterLevel,
        filterSubField,
        filterInstitution,
        filterStatus,
    ]);

    useEffect(() => {
        loadFilters();
    }, []);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    <div className="col-span-3"></div>

                    <div className="col-span-1">
                        <button className="btn btn-sm btn-secondary w-full" onClick={() => setShowCreateModal(true)}>
                            Tambah Sertifikat
                        </button>
                    </div>

                    <div className="col-span-1">
                        <button
                            className="btn btn-sm btn-accent w-full"
                            onClick={() => navigate("/employee/certification/histories")}
                        >
                            Histori
                        </button>
                    </div>

                    <div className="col-span-1">
                        <button
                            className="btn btn-sm btn-accent btn-soft border-accent w-full"
                            onClick={() => {
                                setFilterEmployee(null);
                                setFilterCertCode([]);
                                setFilterLevel([]);
                                setFilterSubField([]);
                                setFilterInstitution([]);
                                setFilterStatus([]);
                                setPage(1);
                                toast.success("Clear filter berhasil");
                            }}
                        >
                            Clear Filter
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
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
                        options={certCodeOptions}
                        value={filterCertCode}
                        onChange={setFilterCertCode}
                        placeholder="Filter Cert Code"
                    />

                    <Select
                        isMulti
                        options={levelOptions}
                        value={filterLevel}
                        onChange={setFilterLevel}
                        placeholder="Filter Jenjang"
                    />

                    <Select
                        isMulti
                        options={subFieldOptions}
                        value={filterSubField}
                        onChange={setFilterSubField}
                        placeholder="Filter Sub Field"
                    />

                    <Select
                        isMulti
                        options={institutionOptions}
                        value={filterInstitution}
                        onChange={setFilterInstitution}
                        placeholder="Filter Lembaga"
                    />

                    <Select
                        isMulti
                        options={[
                            { value: "PENDING", label: "Pending" },
                            { value: "ACTIVE", label: "Active" },
                            { value: "DUE", label: "Due" },
                            { value: "EXPIRED", label: "Expired" },
                            { value: "INVALID", label: "Invalid" },
                        ]}
                        value={filterStatus}
                        onChange={setFilterStatus}
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
                            <th>Nama Pegawai</th>
                            <th>Jabatan</th>
                            <th>Cert Code</th>
                            <th>Jenjang</th>
                            <th>Sub Bidang</th>
                            <th>No Sertifikat</th>
                            <th>Tanggal Sertifikat</th>
                            <th>Tanggal Kadaluarsa</th>
                            <th>Reminder</th>
                            <th>Status</th>
                            <th>Lembaga</th>
                            <th>Updated At</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs whitespace-nowrap">
                        {loading ? (
                            <tr>
                                <td colSpan={15} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={15} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{startIdx + idx}</td>
                                    {/* 🔹 Kolom aksi (hapus tombol "Lihat") */}
                                    <td className="whitespace-nowrap space-x-1">
                                        <button
                                            className="btn btn-xs border-warning btn-soft btn-warning"
                                            onClick={() => setEditData(r)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-xs border-error btn-soft btn-error"
                                            onClick={() => setConfirm({ open: true, id: r.id })}
                                        >
                                            Hapus
                                        </button>
                                        {r.status === "PENDING" && (
                                            <button
                                                className="btn btn-xs border-info btn-soft btn-info"
                                                onClick={() => setUploadData(r)}
                                            >
                                                Upload
                                            </button>
                                        )}
                                    </td>
                                    <td>{r.nip}</td>

                                    {/* 🔹 Nama Pegawai jadi link ke halaman detail */}
                                    <td>
                                        <a
                                            href={`/employee/${r.employeeId}`}
                                            className="hover:text-secondary underline"
                                        >
                                            {r.employeeName}
                                        </a>
                                    </td>

                                    <td>{r.jobPositionTitle || "-"}</td>
                                    <td>{r.certificationCode}</td>
                                    <td>{r.certificationLevelLevel || "-"}</td>
                                    <td>{r.subFieldCode || "-"}</td>
                                    <td>{r.certNumber || "-"}</td>
                                    <td>
                                        {r.certDate
                                            ? new Date(r.certDate).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "-"}
                                    </td>
                                    <td>
                                        {r.validUntil
                                            ? new Date(r.validUntil).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "-"}
                                    </td>
                                    <td>
                                        {r.reminderDate
                                            ? new Date(r.reminderDate).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "-"}
                                    </td>
                                    <td>
                                        <span
                                            className={`badge badge-sm text-white ${
                                                r.status === "PENDING"
                                                    ? "badge-info"
                                                    : r.status === "ACTIVE"
                                                    ? "badge-success"
                                                    : r.status === "DUE"
                                                    ? "badge-warning"
                                                    : r.status === "EXPIRED"
                                                    ? "badge-error"
                                                    : r.status === "INVALID"
                                                    ? "badge-secondary"
                                                    : "badge-neutral"
                                            }`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                    <td>{r.institutionName || "-"}</td>
                                    <td>
                                        {r.updatedAt
                                            ? new Date(r.updatedAt).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                              })
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

            {/* Modal Create */}
            {showCreateModal && (
                <CreateEmployeeCertificationModal
                    open={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSaved={() => {
                        setPage(1);
                        load();
                    }}
                />
            )}

            {/* Modal Edit */}
            {editData && (
                <EditEmployeeCertificationModal
                    open={!!editData}
                    data={editData}
                    onClose={() => setEditData(null)}
                    onSaved={() => {
                        setPage(1);
                        load();
                    }}
                />
            )}

            {/* Modal Upload */}
            {uploadData && (
                <UploadEmployeeCertificationModal
                    open={!!uploadData}
                    certId={uploadData.id}
                    onClose={() => setUploadData(null)}
                    onUploaded={() => {
                        setPage(1);
                        load();
                    }}
                />
            )}

            {/* Modal View */}
            {viewData && (
                <ViewEmployeeCertificationModal
                    open={!!viewData}
                    certId={viewData.id}
                    onClose={() => setViewData(null)}
                />
            )}

            {/* Modal Delete */}
            {confirm.open && (
                <dialog className="modal" open={confirm.open}>
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Hapus Sertifikasi Pegawai?</h3>
                        <p className="py-2">Data sertifikat ini akan dihapus dari sistem.</p>
                        <div className="modal-action">
                            <button className="btn" onClick={() => setConfirm({ open: false, id: null })}>
                                Batal
                            </button>
                            <button
                                className="btn btn-error"
                                onClick={async () => {
                                    await onDelete(confirm.id);
                                    setConfirm({ open: false, id: null });
                                }}
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setConfirm({ open: false, id: null })}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
