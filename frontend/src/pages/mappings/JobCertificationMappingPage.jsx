import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";
import {
    fetchJobCertificationMappingsPaged,
    deleteJobCertificationMapping,
    toggleJobCertificationMapping,
} from "../../services/jobCertificationMappingService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { fetchAllJobPositions } from "../../services/jobPositionService";
import EditJobCertificationMappingModal from "../../components/job-certification-mapping/EditJobCertificationMappingModal";
import { downloadJobCertTemplate } from "../../services/jobCertificationImportService";
import ImportJobCertificationMappingModal from "../../components/job-certification-mapping/ImportJobCertificationMappingModal";

export default function JobCertificationMappingPage() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [jobOptions, setJobOptions] = useState([]);
    const [certOptions, setCertOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subOptions, setSubOptions] = useState([]);

    const [filterJob, setFilterJob] = useState([]);
    const [filterCert, setFilterCert] = useState([]);
    const [filterLevel, setFilterLevel] = useState([]);
    const [filterSub, setFilterSub] = useState([]);
    const [filterStatus, setFilterStatus] = useState({ value: "all", label: "Semua" });

    // Modals
    const [editItem, setEditItem] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null });
    const [openImport, setOpenImport] = useState(false);

    // Load data
    async function load() {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                jobIds: filterJob.map((f) => f.value),
                certCodes: filterCert.map((f) => f.value),
                levels: filterLevel.map((f) => f.value),
                subCodes: filterSub.map((f) => f.value),
                status: filterStatus?.value || "all",
            };

            const res = await fetchJobCertificationMappingsPaged(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("❌ Gagal memuat mapping");
        } finally {
            setLoading(false);
        }
    }

    // Load filter options
    async function loadFilters() {
        try {
            const [jobs, certs, levels, subs] = await Promise.all([
                fetchAllJobPositions(),
                fetchCertifications(),
                fetchCertificationLevels(),
                fetchSubFields(),
            ]);

            setJobOptions(jobs.map((j) => ({ value: j.id, label: j.name })));
            setCertOptions(certs.map((c) => ({ value: c.code, label: c.code })));
            setLevelOptions(levels.map((l) => ({ value: l.level, label: l.name })));
            setSubOptions(subs.map((s) => ({ value: s.code, label: s.code })));
        } catch (err) {
            console.error("❌ loadFilters error:", err);
            toast.error("❌ Gagal memuat filter");
        }
    }

    useEffect(() => {
        load();
    }, [page, rowsPerPage, filterJob, filterCert, filterLevel, filterSub, filterStatus]);

    useEffect(() => {
        loadFilters();
    }, []);

    // Reset filter
    function resetFilter() {
        setFilterJob([]);
        setFilterCert([]);
        setFilterLevel([]);
        setFilterSub([]);
        setFilterStatus({ value: "all", label: "Semua" });
        setPage(1);
        toast.success("Filter berhasil direset");
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                {/* 🔹 Row 1: Tombol Aksi */}
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    <div className="col-span-3"></div>

                    <div className="col-span-1">
                        <button className="btn btn-warning btn-sm w-full" onClick={downloadJobCertTemplate}>
                            Download Template
                        </button>
                    </div>

                    <div className="col-span-1">
                        <button className="btn btn-success btn-sm w-full" onClick={() => setOpenImport(true)}>
                            Import Excel
                        </button>
                    </div>

                    {/* 🔹 Tombol Histori */}
                    <div className="col-span-1">
                        <button
                            className="btn btn-accent btn-sm w-full"
                            onClick={() => navigate("/mapping/job-certification/histories")}
                        >
                            Histori
                        </button>
                    </div>
                </div>

                {/* 🔹 Row 2: Filters + Clear Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                    <Select
                        isMulti
                        options={jobOptions}
                        value={filterJob}
                        onChange={setFilterJob}
                        placeholder="Filter Jabatan"
                    />
                    <Select
                        isMulti
                        options={certOptions}
                        value={filterCert}
                        onChange={setFilterCert}
                        placeholder="Filter Sertifikasi"
                    />
                    <Select
                        isMulti
                        options={levelOptions}
                        value={filterLevel}
                        onChange={setFilterLevel}
                        placeholder="Filter Level"
                    />
                    <Select
                        isMulti
                        options={subOptions}
                        value={filterSub}
                        onChange={setFilterSub}
                        placeholder="Filter Sub Bidang"
                    />
                    <Select
                        options={[
                            { value: "all", label: "Semua" },
                            { value: "active", label: "Aktif" },
                            { value: "inactive", label: "Nonaktif" },
                        ]}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        placeholder="Status"
                    />
                    <button className="btn btn-accent btn-soft border-accent btn-sm w-full" onClick={resetFilter}>
                        Clear Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>Jabatan</th>
                            <th>Sertifikasi</th>
                            <th>Jenjang</th>
                            <th>Sub Bidang</th>
                            <th>Status</th>
                            <th>Updated At</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{startIdx + idx}</td>
                                    <td className="space-x-1">
                                        <button
                                            className={`btn btn-xs ${
                                                r.isActive
                                                    ? "btn-secondary border-secondary btn-soft"
                                                    : "btn-success border-success btn-soft"
                                            }`}
                                            onClick={() => toggleJobCertificationMapping(r.id).then(load)}
                                        >
                                            {r.isActive ? "Nonaktifkan" : "Aktifkan"}
                                        </button>
                                        <button
                                            className="btn btn-xs border-warning btn-soft btn-warning"
                                            onClick={() => setEditItem(r)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-xs border-error btn-soft btn-error"
                                            onClick={() => setConfirm({ open: true, id: r.id })}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                    <td>{r.jobName}</td>
                                    <td>{r.certificationCode}</td>
                                    <td>{r.certificationLevelLevel || "-"}</td>
                                    <td>{r.subFieldCode || "-"}</td>
                                    <td>
                                        {r.isActive ? (
                                            <span className="badge badge-success border-success badge-sm text-slate-50">
                                                Aktif
                                            </span>
                                        ) : (
                                            <span className="badge badge-secondary border-secondary badge-sm text-slate-50">
                                                Nonaktif
                                            </span>
                                        )}
                                    </td>
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

            {/* Modals */}
            <EditJobCertificationMappingModal
                open={!!editItem}
                initial={editItem}
                onClose={() => setEditItem(null)}
                onSaved={() => {
                    setEditItem(null);
                    load();
                }}
            />
            <ImportJobCertificationMappingModal
                open={openImport}
                onClose={() => setOpenImport(false)}
                onImported={load}
            />

            {/* Confirm Delete */}
            <dialog className="modal" open={confirm.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Hapus Mapping?</h3>
                    <p className="py-2">Mapping ini akan dinonaktifkan dari sistem.</p>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setConfirm({ open: false, id: null })}>
                            Batal
                        </button>
                        <button
                            className="btn btn-error"
                            onClick={() => {
                                deleteJobCertificationMapping(confirm.id)
                                    .then(() => {
                                        toast.success("✅ Mapping dihapus");
                                        load();
                                    })
                                    .catch(() => toast.error("❌ Gagal menghapus mapping"))
                                    .finally(() => setConfirm({ open: false, id: null }));
                            }}
                        >
                            Hapus
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}
