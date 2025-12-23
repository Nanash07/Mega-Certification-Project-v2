// src/pages/job-certification/JobCertificationMappingPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import { Download, Upload, History as HistoryIcon, Pencil, Trash2, Eraser, ChevronDown } from "lucide-react";

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
import { fetchMyPicScope } from "../../services/picScopeService";
import EditJobCertificationMappingModal from "../../components/job-certification-mapping/EditJobCertificationMappingModal";
import { downloadJobCertTemplate } from "../../services/jobCertificationImportService";
import ImportJobCertificationMappingModal from "../../components/job-certification-mapping/ImportJobCertificationMappingModal";

const TABLE_COLS = 8;

// ===== helper role dari localStorage =====
function getCurrentRole() {
    if (typeof window === "undefined") return "";
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const fromUser = (user.role || "").toString().toUpperCase();
        if (fromUser) return fromUser;
    } catch {
        // ignore
    }
    return (localStorage.getItem("role") || "").toString().toUpperCase();
}

export default function JobCertificationMappingPage() {
    const navigate = useNavigate();

    // ===== role flags =====
    const [role] = useState(() => getCurrentRole());
    const isSuperadmin = role === "SUPERADMIN";
    const isPic = role === "PIC";
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters master options
    const [jobOptions, setJobOptions] = useState([]);
    const [certOptions, setCertOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subOptions, setSubOptions] = useState([]);

    // Filter values
    const [filterJob, setFilterJob] = useState([]);
    const [filterCert, setFilterCert] = useState([]);
    const [filterLevel, setFilterLevel] = useState([]);
    const [filterSub, setFilterSub] = useState([]);
    const [filterStatus, setFilterStatus] = useState({ value: "all", label: "Semua" });

    // PIC scope → certification IDs yg boleh (buat param allowedCertificationIds)
    const [allowedCertificationIds, setAllowedCertificationIds] = useState(null);

    // Modals
    const [editItem, setEditItem] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null });
    const [openImport, setOpenImport] = useState(false);

    // Floating status menu: { row, x, y } | null
    const [statusMenu, setStatusMenu] = useState(null);

    // 🔹 Helper tanggal + jam
    function formatDateTime(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    // 🔹 Style status untuk ACTIVE / INACTIVE (isActive boolean)
    function getStatusStyle(isActive) {
        if (isActive) {
            return {
                label: "Aktif",
                badgeCls: "badge-success",
                btnCls: "btn-success",
            };
        }
        return {
            label: "Nonaktif",
            badgeCls: "badge-secondary",
            btnCls: "btn-secondary",
        };
    }

    // 🔹 Badge status: bisa diklik buat buka menu pilihan
    function renderStatusBadge(row) {
        const { label, badgeCls } = getStatusStyle(row.isActive);

        return (
            <button
                type="button"
                className={`badge badge-sm whitespace-nowrap cursor-pointer flex items-center gap-1 ${badgeCls} text-white`}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStatusMenu({
                        row,
                        x: rect.left,
                        y: rect.bottom + 4,
                    });
                }}
            >
                <span>{label}</span>
                <ChevronDown className="w-3 h-3" />
            </button>
        );
    }

    // 🔹 Load data
    async function load() {
        // extra guard: pegawai tidak boleh load
        if (isEmployee) return;

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

            // PIC → batasi berdasarkan certification IDs yang diizinkan (PIC scope)
            if (isPic && Array.isArray(allowedCertificationIds) && allowedCertificationIds.length > 0) {
                params.allowedCertificationIds = allowedCertificationIds;
            }

            const res = await fetchJobCertificationMappingsPaged(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch (e) {
            console.error("fetchJobCertificationMappingsPaged error:", e);
            toast.error("Gagal memuat mapping");
        } finally {
            setLoading(false);
        }
    }

    // 🔹 Load filter options (aware PIC scope)
    async function loadFilters() {
        // employee tidak perlu load apa-apa
        if (isEmployee) return;

        try {
            if (isPic) {
                // PIC: ambil scope + master data, lalu filter sertifikasi berdasarkan scope
                const [jobs, certs, levels, subs, scope] = await Promise.all([
                    fetchAllJobPositions(),
                    fetchCertifications(),
                    fetchCertificationLevels(),
                    fetchSubFields(),
                    fetchMyPicScope(),
                ]);

                const scopeCerts = scope?.certifications || [];
                const codesSet = new Set(
                    scopeCerts.map((s) => s.certificationCode).filter((c) => c && String(c).trim() !== "")
                );
                const ids = scopeCerts.map((s) => s.certificationId).filter((id) => id != null);

                setAllowedCertificationIds(ids);

                const filteredCerts = (certs || []).filter((c) => codesSet.has(c.code));

                setJobOptions((jobs || []).map((j) => ({ value: j.id, label: j.name })));
                setCertOptions(filteredCerts.map((c) => ({ value: c.code, label: c.code })));
                setLevelOptions((levels || []).map((l) => ({ value: l.level, label: l.name })));
                setSubOptions((subs || []).map((s) => ({ value: s.code, label: s.code })));
            } else {
                // SUPERADMIN (dan role lain non-employee) → full master data
                const [jobs, certs, levels, subs] = await Promise.all([
                    fetchAllJobPositions(),
                    fetchCertifications(),
                    fetchCertificationLevels(),
                    fetchSubFields(),
                ]);

                setJobOptions((jobs || []).map((j) => ({ value: j.id, label: j.name })));
                setCertOptions((certs || []).map((c) => ({ value: c.code, label: c.code })));
                setLevelOptions((levels || []).map((l) => ({ value: l.level, label: l.name })));
                setSubOptions((subs || []).map((s) => ({ value: s.code, label: s.code })));
            }
        } catch (err) {
            console.error("loadFilters error:", err);
            toast.error("Gagal memuat filter");
        }
    }

    // redirect kalau pegawai
    useEffect(() => {
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEmployee]);

    // load data
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, filterJob, filterCert, filterLevel, filterSub, filterStatus, allowedCertificationIds]);

    // load filter master
    useEffect(() => {
        loadFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // 🔹 Ubah status via badge (pakai toggle API)
    async function handleChangeStatus(row, desiredActive) {
        if (row.isActive === desiredActive) {
            return;
        }
        try {
            await toggleJobCertificationMapping(row.id);
            await load();
            toast.success(desiredActive ? "Mapping diaktifkan" : "Mapping dinonaktifkan");
        } catch {
            toast.error("Gagal mengubah status mapping");
        }
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    // Selama redirect pegawai, jangan render apapun
    if (isEmployee) {
        return null;
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                {/* Row 1: Tombol Aksi */}
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-success btn-sm w-full"
                            onClick={() => setOpenImport(true)}
                        >
                            <Upload className="w-4 h-4" />
                            <span>Import Excel</span>
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm w-full"
                            onClick={downloadJobCertTemplate}
                        >
                            <Download className="w-4 h-4" />
                            <span>Download Template</span>
                        </button>
                    </div>

                    <div className="col-span-3" />

                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-accent btn-sm w-full"
                            onClick={() => navigate("/mapping/job-certification/histories")}
                        >
                            <HistoryIcon className="w-4 h-4" />
                            <span>Histori</span>
                        </button>
                    </div>
                </div>

                {/* Row 2: Filters + Clear Filter */}
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
                    <button
                        type="button"
                        className="btn btn-accent btn-soft border-accent btn-sm w-full"
                        onClick={resetFilter}
                    >
                        <Eraser className="w-4 h-4" />
                        <span>Clear Filter</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs whitespace-nowrap">
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
                    <tbody className="text-xs whitespace-nowrap">
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
                            rows.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{startIdx + idx}</td>

                                    {/* Aksi: edit + delete */}
                                    <td className="space-x-1">
                                        <button
                                            type="button"
                                            className="btn btn-xs border-warning btn-soft btn-warning"
                                            onClick={() => setEditItem(r)}
                                            title="Edit mapping"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-xs border-error btn-soft btn-error"
                                            onClick={() => setConfirm({ open: true, id: r.id })}
                                            title="Hapus mapping"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </td>

                                    <td>{r.jobName}</td>
                                    <td>{r.certificationCode}</td>
                                    <td>{r.certificationLevelLevel || "-"}</td>
                                    <td>{r.subFieldCode || "-"}</td>
                                    <td>{renderStatusBadge(r)}</td>
                                    <td>{formatDateTime(r.updatedAt)}</td>
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
                        <button type="button" className="btn" onClick={() => setConfirm({ open: false, id: null })}>
                            Batal
                        </button>
                        <button
                            type="button"
                            className="btn btn-error"
                            onClick={() => {
                                deleteJobCertificationMapping(confirm.id)
                                    .then(() => {
                                        toast.success("Mapping dihapus");
                                        load();
                                    })
                                    .catch(() => toast.error("Gagal menghapus mapping"))
                                    .finally(() => setConfirm({ open: false, id: null }));
                            }}
                        >
                            Hapus
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button type="button" onClick={() => setConfirm({ open: false, id: null })}>
                        close
                    </button>
                </form>
            </dialog>

            {/* Floating status menu: Aktif / Nonaktif */}
            {statusMenu && (
                <div className="fixed inset-0 z-[999]" onClick={() => setStatusMenu(null)}>
                    <div
                        className="absolute"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-2xl p-3 text-xs flex flex-col gap-2">
                            {[
                                { active: true, label: "Aktif" },
                                { active: false, label: "Nonaktif" },
                            ].map(({ active, label }) => {
                                const { btnCls } = getStatusStyle(active);
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        className={`btn btn-xs ${btnCls} text-white rounded-full w-full justify-center`}
                                        onClick={async () => {
                                            await handleChangeStatus(statusMenu.row, active);
                                            setStatusMenu(null);
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
