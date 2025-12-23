import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";
import { fetchCertificationRuleHistories } from "../../services/certificationRuleHistoryService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchMyPicScope } from "../../services/picScopeService";
import { ArrowLeft } from "lucide-react";

// (optional) helper role kalau tetap mau blok PEGAWAI
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

export default function CertificationRuleHistoryPage() {
    const navigate = useNavigate();

    // ==== ROLE (kalau mau dibuang juga boleh, sama kayak EmployeeHistoryPage) ====
    const [role, setRole] = useState(null);
    useEffect(() => {
        setRole(getCurrentRole());
    }, []);
    const isRoleLoaded = role !== null;
    const isPic = role === "PIC";
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

    // ==== STATE DATA ====
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const actionOptions = useMemo(
        () => [
            { value: "all", label: "Semua Aksi" },
            { value: "CREATED", label: "CREATED" },
            { value: "UPDATED", label: "UPDATED" },
            { value: "DELETED", label: "DELETED" },
        ],
        []
    );
    const [filterAction, setFilterAction] = useState(actionOptions[0]);
    const [filterRule, setFilterRule] = useState(null);

    // Master rule options (untuk filter sertifikasi)
    const [ruleOptions, setRuleOptions] = useState([]);
    const [picCertCodes, setPicCertCodes] = useState(null);

    // ==== UTILS ====
    const formatDateTime = (val) => {
        if (!val) return "-";
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    // ==== LOAD RULE OPTIONS (buat Select filter) ====
    const loadRuleOptions = useCallback(async () => {
        if (!isRoleLoaded || isEmployee) return;

        try {
            const rules = await fetchCertificationRules(); // list semua aturan sertifikasi
            let effective = rules || [];

            if (isPic) {
                try {
                    const scope = await fetchMyPicScope();
                    const codes = new Set(
                        (scope?.certifications || [])
                            .map((s) => s.certificationCode)
                            .filter((c) => c && String(c).trim() !== "")
                    );
                    setPicCertCodes(codes);
                    effective = effective.filter((r) => r.certificationCode && codes.has(r.certificationCode));
                } catch (e) {
                    console.error("load PIC scope (history) error:", e);
                    toast.error("Gagal memuat scope sertifikasi PIC");
                }
            }

            const opts = effective.map((r) => {
                const parts = [r.certificationCode, r.certificationLevelLevel, r.subFieldCode].filter(
                    (x) => x && String(x).trim() !== ""
                );
                return {
                    value: r.id,
                    label: parts.join(" - ") || r.certificationCode || `Rule #${r.id}`,
                };
            });

            setRuleOptions(opts);
        } catch (err) {
            console.error("loadRuleOptions error:", err);
            toast.error("Gagal memuat daftar aturan sertifikasi");
        }
    }, [isRoleLoaded, isEmployee, isPic]);

    // ==== LOAD HISTORIES ====
    const load = useCallback(async () => {
        if (!isRoleLoaded || isEmployee) return;

        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                actionType: filterAction?.value || "all",
                ruleId: filterRule?.value ?? null,
            };

            const res = await fetchCertificationRuleHistories(params);
            let content = res.content || [];

            // PIC: filter lagi kalau ada scope
            if (isPic && picCertCodes && picCertCodes.size > 0) {
                content = content.filter((h) => h.certificationCode && picCertCodes.has(h.certificationCode));
            }

            setRows(content);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch (err) {
            console.error("load histories error:", err);
            toast.error("Gagal memuat histori aturan sertifikasi");
        } finally {
            setLoading(false);
        }
    }, [isRoleLoaded, isEmployee, page, rowsPerPage, filterAction, filterRule, isPic, picCertCodes]);

    // ==== REDIRECT PEGAWAI (kalau mau strict kayak sebelumnya) ====
    useEffect(() => {
        if (!isRoleLoaded) return;
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRoleLoaded, isEmployee]);

    // initial load rules
    useEffect(() => {
        loadRuleOptions();
    }, [loadRuleOptions]);

    // load histories tiap filter/page berubah
    useEffect(() => {
        load();
    }, [load]);

    // kalau filter berubah → reset ke page 1
    useEffect(() => {
        setPage(1);
    }, [filterAction, filterRule]);

    // reset filter
    const resetFilter = () => {
        setFilterRule(null);
        setFilterAction(actionOptions[0]);
        setPage(1);
        toast.success("Filter berhasil direset");
    };

    if (!isRoleLoaded || isEmployee) {
        return null;
    }

    return (
        <div className="p-4 space-y-5">
            {/* Back button */}
            <div className="flex justify-start mb-3">
                <button
                    type="button"
                    className="btn btn-accent btn-sm flex items-center gap-2"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={16} /> Kembali
                </button>
            </div>

            {/* Filters (mirip EmployeeHistoryPage) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                {/* Filter Rule / Sertifikasi */}
                <div className="col-span-1">
                    <Select
                        options={ruleOptions}
                        value={filterRule}
                        onChange={setFilterRule}
                        isClearable
                        placeholder="Filter Aturan Sertifikasi"
                    />
                </div>

                {/* Filter Aksi */}
                <div className="col-span-2 sm:col-span-1">
                    <Select
                        options={actionOptions}
                        value={filterAction}
                        onChange={setFilterAction}
                        placeholder="Filter Aksi"
                    />
                </div>

                {/* Spacer */}
                <div className="col-span-3 hidden lg:block" />

                {/* Clear Filter */}
                <div className="col-span-2 sm:col-span-1">
                    <button
                        type="button"
                        className="btn btn-accent btn-soft border-accent btn-sm w-full"
                        onClick={resetFilter}
                    >
                        Clear Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra text-xs">
                    <thead className="bg-base-200 text-xs">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>Action At</th>
                            <th>Sertifikasi</th>
                            <th>Jenjang</th>
                            <th>Sub Bidang</th>
                            <th>Masa Berlaku</th>
                            <th>Reminder</th>
                            <th>Refreshment</th>
                            <th>Wajib Setelah Masuk</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={11} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{startIdx + idx}</td>
                                    <td>
                                        <span className="badge badge-info badge-sm text-white">{r.actionType}</span>
                                    </td>
                                    <td>{formatDateTime(r.actionAt)}</td>
                                    <td>{r.certificationCode || "-"}</td>
                                    <td>{r.certificationLevelLevel || "-"}</td>
                                    <td>{r.subFieldCode || "-"}</td>
                                    <td>{r.validityMonths != null ? `${r.validityMonths} bulan` : "-"}</td>
                                    <td>{r.reminderMonths != null ? `${r.reminderMonths} bulan` : "-"}</td>
                                    <td>{r.refreshmentTypeName || "-"}</td>
                                    <td>{r.wajibSetelahMasuk != null ? `${r.wajibSetelahMasuk} bulan` : "-"}</td>
                                    <td>
                                        {r.isActive ? (
                                            <span className="badge badge-success badge-sm text-white">ACTIVE</span>
                                        ) : (
                                            <span className="badge badge-warning badge-sm text-white">NONACTIVE</span>
                                        )}
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
        </div>
    );
}
