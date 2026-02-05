import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import { Plus, History as HistoryIcon, Pencil, Trash2, ChevronDown, Eraser, Search, Filter, FileCheck } from "lucide-react";

import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getCurrentRole, formatDateTime } from "../../utils/helpers";
import {
    fetchCertificationRulesPaged,
    deleteCertificationRule,
    toggleCertificationRule,
} from "../../services/certificationRuleService";
import { fetchCertifications } from "../../services/certificationService";
import { fetchCertificationLevels } from "../../services/certificationLevelService";
import { fetchSubFields } from "../../services/subFieldService";
import { fetchMyPicScope } from "../../services/picScopeService";
import CreateCertificationRuleModal from "../../components/certification-rules/CreateCertificationRuleModal";
import EditCertificationRuleModal from "../../components/certification-rules/EditCertificationRuleModal";

const TABLE_COLS = 10;

export default function CertificationRulePage() {
    const navigate = useNavigate();

    const [role] = useState(() => getCurrentRole());
    const isSuperadmin = role === "SUPERADMIN";
    const isPic = role === "PIC";
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null });

    const [statusMenu, setStatusMenu] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [certOptions, setCertOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subOptions, setSubOptions] = useState([]);

    const [filterCert, setFilterCert] = useState(null);
    const [filterLevel, setFilterLevel] = useState(null);
    const [filterSub, setFilterSub] = useState(null);
    const [filterStatus, setFilterStatus] = useState({ value: "all", label: "Semua" });

    const [picCertCodes, setPicCertCodes] = useState(null);

    function getStatusStyle(isActive) {
        if (isActive) {
            return { label: "Aktif", badgeCls: "badge-success", btnCls: "btn-success" };
        }
        return { label: "Nonaktif", badgeCls: "badge-secondary", btnCls: "btn-secondary" };
    }

    function renderStatusBadge(row) {
        const { label, badgeCls } = getStatusStyle(row.isActive);
        return (
            <button
                type="button"
                className={`badge badge-sm whitespace-nowrap cursor-pointer flex items-center gap-1 ${badgeCls} text-white`}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStatusMenu({ row, x: rect.left, y: rect.bottom + 4 });
                }}
            >
                <span>{label}</span>
                <ChevronDown className="w-3 h-3" />
            </button>
        );
    }

    async function load() {
        if (isEmployee) return;
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                status: filterStatus?.value || "all",
            };

            if (filterCert) params.certIds = [filterCert.value];
            if (filterLevel) params.levelIds = [filterLevel.value];
            if (filterSub) params.subIds = [filterSub.value];

            const res = await fetchCertificationRulesPaged(params);
            let content = res.content || [];

            if (isPic && picCertCodes && picCertCodes.size > 0) {
                content = content.filter((r) => r.certificationCode && picCertCodes.has(r.certificationCode));
            }

            setRows(content);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch (err) {
            toast.error("Gagal memuat aturan sertifikasi");
            console.error("fetchCertificationRulesPaged error:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadFilters() {
        if (isEmployee) return;
        try {
            const [certs, levels, subs] = await Promise.all([
                fetchCertifications(),
                fetchCertificationLevels(),
                fetchSubFields(),
            ]);

            let effectiveCerts = certs || [];

            if (isPic) {
                try {
                    const scope = await fetchMyPicScope();
                    const scopeCerts = scope?.certifications || [];
                    const codes = new Set(
                        scopeCerts.map((s) => s.certificationCode).filter((code) => code && String(code).trim() !== "")
                    );
                    setPicCertCodes(codes);
                    effectiveCerts = effectiveCerts.filter((c) => codes.has(c.code));
                } catch (e) {
                    console.error("load PIC scope error:", e);
                    toast.error("Gagal memuat scope sertifikasi PIC");
                }
            }

            setCertOptions((effectiveCerts || []).map((c) => ({ value: c.id, label: c.code })));
            setLevelOptions((levels || []).map((l) => ({ value: l.id, label: `${l.level}` })));
            setSubOptions((subs || []).map((s) => ({ value: s.id, label: s.code })));
        } catch (e) {
            console.error("loadFilters error:", e);
            toast.error("Gagal memuat data filter");
        }
    }

    useEffect(() => {
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
    }, [isEmployee]);

    useEffect(() => {
        load();
    }, [page, rowsPerPage, filterCert, filterLevel, filterSub, filterStatus, picCertCodes]);

    useEffect(() => {
        loadFilters();
    }, []);

    async function onDelete(id) {
        try {
            await deleteCertificationRule(id);
            toast.success("Aturan sertifikasi dihapus");
            load();
        } catch {
            toast.error("Gagal menghapus aturan sertifikasi");
        }
    }

    async function onToggle(id) {
        try {
            await toggleCertificationRule(id);
            toast.success("Status berhasil diperbarui");
            load();
        } catch {
            toast.error("Gagal update status");
        }
    }

    async function handleChangeStatus(row, desiredActive) {
        if (row.isActive === desiredActive) return;
        await onToggle(row.id);
    }

    function resetFilter() {
        setFilterCert(null);
        setFilterLevel(null);
        setFilterSub(null);
        setFilterStatus({ value: "all", label: "Semua" });
        setPage(1);
        toast.success("Filter dibersihkan");
    }

    // Custom styles matching Dashboard
    const selectStyles = {
        control: (base) => ({
            ...base,
            minHeight: '32px',
            height: '32px',
            fontSize: '12px',
        }),
        valueContainer: (base) => ({
            ...base,
            height: '32px',
            padding: '0 8px',
        }),
        input: (base) => ({
            ...base,
            margin: '0px',
            padding: '0px',
        }),
        indicatorsContainer: (base) => ({
            ...base,
            height: '32px',
        }),
        dropdownIndicator: (base) => ({
            ...base,
            padding: '4px',
        }),
        clearIndicator: (base) => ({
            ...base,
            padding: '4px',
        }),
        option: (base) => ({
            ...base,
            fontSize: '12px',
            padding: '6px 10px',
        }),
        menu: (base) => ({
            ...base,
            fontSize: '12px',
        }),
    };

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    if (isEmployee) return null;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Aturan Sertifikat</h1>
                    <p className="text-xs text-gray-500">{totalElements} aturan sertifikasi</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="btn btn-sm btn-primary rounded-lg"
                        onClick={() => setOpenCreate(true)}
                    >
                        <Plus size={14} />
                        Tambah Aturan
                    </button>
                    <button
                        className="btn btn-sm btn-accent rounded-lg"
                        onClick={() => navigate("/sertifikat/aturan-sertifikat/histories")}
                    >
                        <HistoryIcon size={14} />
                        Histori
                    </button>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Sertifikasi
                        </label>
                        <Select
                            options={certOptions}
                            value={filterCert}
                            onChange={setFilterCert}
                            isClearable
                            placeholder="Filter Sertifikasi"
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Level
                        </label>
                        <Select
                            options={levelOptions}
                            value={filterLevel}
                            onChange={setFilterLevel}
                            isClearable
                            placeholder="Filter Level"
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Sub Bidang
                        </label>
                        <Select
                            options={subOptions}
                            value={filterSub}
                            onChange={setFilterSub}
                            isClearable
                            placeholder="Filter Sub Bidang"
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Status
                        </label>
                        <Select
                            options={[
                                { value: "all", label: "Semua" },
                                { value: "active", label: "Aktif" },
                                { value: "inactive", label: "Nonaktif" },
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="Status"
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <button
                            className="btn btn-sm btn-accent btn-soft w-full flex gap-2 rounded-lg"
                            onClick={resetFilter}
                        >
                            <Eraser size={14} />
                            Clear Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead className="bg-base-200 text-xs">
                            <tr>
                                <th className="w-12">No</th>
                                <th className="w-24">Aksi</th>
                                <th>Sertifikasi</th>
                                <th>Jenjang</th>
                                <th>Sub Bidang</th>
                                <th>Masa Berlaku</th>
                                <th>Reminder</th>
                                <th>Wajib Setelah Masuk</th>
                                <th className="w-28">Status</th>
                                <th>Updated At</th>
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
                                            <FileCheck size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data aturan sertifikasi</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <div className="tooltip" data-tip="Edit aturan">
                                                    <button
                                                        className="btn btn-xs btn-soft btn-warning border border-warning rounded-lg"
                                                        onClick={() => setEditItem(r)}
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                                <div className="tooltip" data-tip="Hapus aturan">
                                                    <button
                                                        className="btn btn-xs btn-soft btn-error border border-error rounded-lg"
                                                        onClick={() => setConfirm({ open: true, id: r.id })}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-medium">{r.certificationCode}</td>
                                        <td>{r.certificationLevelLevel || "-"}</td>
                                        <td>{r.subFieldCode || "-"}</td>
                                        <td>{r.validityMonths} bulan</td>
                                        <td>{r.reminderMonths} bulan</td>
                                        <td>{r.wajibSetelahMasuk != null ? `${r.wajibSetelahMasuk} bulan` : "-"}</td>
                                        <td>{renderStatusBadge(r)}</td>
                                        <td className="text-gray-500">{formatDateTime(r.updatedAt)}</td>
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

            {/* Modals */}
            <CreateCertificationRuleModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onSaved={() => {
                    setOpenCreate(false);
                    load();
                }}
            />
            <EditCertificationRuleModal
                open={!!editItem}
                initial={editItem}
                onClose={() => setEditItem(null)}
                onSaved={() => {
                    setEditItem(null);
                    load();
                }}
            />

            <ConfirmDialog
                open={confirm.open}
                title="Hapus Aturan Sertifikasi?"
                message="Data ini akan dinonaktifkan dari sistem."
                onConfirm={() => {
                    if (!confirm.id) return;
                    onDelete(confirm.id);
                    setConfirm({ open: false, id: null });
                }}
                onCancel={() => setConfirm({ open: false, id: null })}
            />

            {/* Floating status menu */}
            {statusMenu && (
                <div className="fixed inset-0 z-[999]" onClick={() => setStatusMenu(null)}>
                    <div
                        className="absolute"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-xl border border-gray-200 p-2 text-xs flex flex-col gap-1.5">
                            {[
                                { active: true, label: "Aktif" },
                                { active: false, label: "Nonaktif" },
                            ].map(({ active, label }) => {
                                const { btnCls } = getStatusStyle(active);
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        className={`btn btn-xs ${btnCls} text-white rounded-lg w-full justify-center`}
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
