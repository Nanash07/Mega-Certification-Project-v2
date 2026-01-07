import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import { Plus, History as HistoryIcon, Pencil, Trash2, ChevronDown, Eraser } from "lucide-react";

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

const TABLE_COLS = 11;

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

    // Floating status menu: { row, x, y } | null
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

    const [filterCert, setFilterCert] = useState([]);
    const [filterLevel, setFilterLevel] = useState([]);
    const [filterSub, setFilterSub] = useState([]);
    const [filterStatus, setFilterStatus] = useState({
        value: "all",
        label: "Semua",
    });

    // Scope PIC (kode sertifikasi yang boleh di-manage PIC)
    const [picCertCodes, setPicCertCodes] = useState(null);



    // 🔹 Style status (Aktif / Nonaktif)
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

    // 🔹 Badge status klik → floating menu
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
        // Employee seharusnya sudah di-redirect, tapi guard ekstra
        if (isEmployee) return;

        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                status: filterStatus?.value || "all",
            };

            if (filterCert.length > 0) params.certIds = filterCert.map((f) => f.value);
            if (filterLevel.length > 0) params.levelIds = filterLevel.map((f) => f.value);
            if (filterSub.length > 0) params.subIds = filterSub.map((f) => f.value);

            const res = await fetchCertificationRulesPaged(params);
            let content = res.content || [];

            // PIC: filter lagi di FE supaya hanya lihat rule dengan certificationCode yang ada di scope PIC
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

    // 🔹 Load filter master (role aware)
    async function loadFilters() {
        // Employee gak perlu load filter karena gak boleh akses
        if (isEmployee) return;

        try {
            const [certs, levels, subs] = await Promise.all([
                fetchCertifications(),
                fetchCertificationLevels(),
                fetchSubFields(),
            ]);

            let effectiveCerts = certs || [];

            if (isPic) {
                // PIC → batasi sertifikasi berdasarkan scope PIC (pakai certificationCode)
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

            // Sertifikasi
            setCertOptions(
                (effectiveCerts || []).map((c) => ({
                    value: c.id,
                    label: c.code,
                }))
            );

            // Level
            setLevelOptions(
                (levels || []).map((l) => ({
                    value: l.id,
                    label: `${l.level}`,
                }))
            );

            // Sub bidang
            setSubOptions(
                (subs || []).map((s) => ({
                    value: s.id,
                    label: s.code,
                }))
            );
        } catch (e) {
            console.error("loadFilters error:", e);
            toast.error("Gagal memuat data filter");
        }
    }

    useEffect(() => {
        // kalau role PEGAWAI, langsung tendang keluar
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEmployee]);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, filterCert, filterLevel, filterSub, filterStatus, picCertCodes]);

    useEffect(() => {
        loadFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 🔹 Delete
    async function onDelete(id) {
        try {
            await deleteCertificationRule(id);
            toast.success("Aturan sertifikasi dihapus");
            load();
        } catch {
            toast.error("Gagal menghapus aturan sertifikasi");
        }
    }

    // 🔹 Toggle status via API
    async function onToggle(id) {
        try {
            await toggleCertificationRule(id);
            toast.success("Status berhasil diperbarui");
            load();
        } catch {
            toast.error("Gagal update status");
        }
    }

    // 🔹 Handler dari floating menu
    async function handleChangeStatus(row, desiredActive) {
        if (row.isActive === desiredActive) {
            return;
        }
        await onToggle(row.id);
    }

    // 🔹 Reset filter
    function resetFilter() {
        setFilterCert([]);
        setFilterLevel([]);
        setFilterSub([]);
        setFilterStatus({ value: "all", label: "Semua" });
        setPage(1);
        toast.success("Filter berhasil direset");
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    // Kalau lagi redirect sebagai PEGAWAI, jangan render apa-apa dulu
    if (isEmployee) {
        return null;
    }

    return (
        <div>
            {/* Toolbar Filter + Actions */}
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end text-xs">
                    {/* Filter Sertifikasi */}
                    <div className="col-span-1">
                        <Select
                            options={certOptions}
                            value={filterCert}
                            onChange={setFilterCert}
                            isClearable
                            isMulti
                            placeholder="Filter Sertifikasi"
                        />
                    </div>

                    {/* Filter Level */}
                    <div className="col-span-1">
                        <Select
                            options={levelOptions}
                            value={filterLevel}
                            onChange={setFilterLevel}
                            isClearable
                            isMulti
                            placeholder="Filter Level"
                        />
                    </div>

                    {/* Filter Sub Bidang */}
                    <div className="col-span-1">
                        <Select
                            options={subOptions}
                            value={filterSub}
                            onChange={setFilterSub}
                            isClearable
                            isMulti
                            placeholder="Filter Sub Bidang"
                        />
                    </div>

                    {/* Filter Status */}
                    <div className="col-span-1">
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
                    </div>

                    {/* Tambah aturan (hanya untuk admin/PIC) */}
                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-primary btn-sm w-full"
                            onClick={() => setOpenCreate(true)}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Tambah Aturan</span>
                        </button>
                    </div>

                    {/* Histori */}
                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-accent btn-sm w-full"
                            onClick={() => navigate("/sertifikat/aturan-sertifikat/histories")}
                        >
                            <HistoryIcon className="w-4 h-4" />
                            <span>Histori</span>
                        </button>
                    </div>

                    {/* Clear Filter */}
                    <div className="col-span-1">
                        <button
                            type="button"
                            className="btn btn-accent btn-soft border-accent btn-sm w-full"
                            onClick={resetFilter}
                        >
                            <Eraser className="w-4 h-4" />
                            Clear Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs whitespace-nowrap">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>Sertifikasi</th>
                            <th>Jenjang</th>
                            <th>Sub Bidang</th>
                            <th>Masa Berlaku</th>
                            <th>Reminder</th>
                            <th>Refreshment</th>
                            <th>Wajib Setelah Masuk</th>
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

                                    {/* Aksi: edit + delete (icon + tooltip) */}
                                    <td className="space-x-1">
                                        <div className="inline-block tooltip" data-tip="Edit aturan">
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-soft btn-warning border-warning"
                                                onClick={() => setEditItem(r)}
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="inline-block tooltip" data-tip="Hapus aturan">
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-soft btn-error border-error"
                                                onClick={() => setConfirm({ open: true, id: r.id })}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>

                                    <td>{r.certificationCode}</td>
                                    <td>{r.certificationLevelLevel || "-"}</td>
                                    <td>{r.subFieldCode || "-"}</td>
                                    <td>{r.validityMonths} bulan</td>
                                    <td>{r.reminderMonths} bulan</td>
                                    <td>{r.refreshmentTypeName || "-"}</td>
                                    <td>{r.wajibSetelahMasuk != null ? `${r.wajibSetelahMasuk} bulan` : "-"}</td>
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
