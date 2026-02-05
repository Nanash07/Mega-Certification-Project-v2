import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";
import { getCurrentRole, formatDateTime } from "../../utils/helpers";
import { fetchCertificationRuleHistories } from "../../services/certificationRuleHistoryService";
import { fetchCertificationRules } from "../../services/certificationRuleService";
import { fetchMyPicScope } from "../../services/picScopeService";
import { ArrowLeft, Eraser, Filter, History as HistoryIcon } from "lucide-react";

export default function CertificationRuleHistoryPage() {
    const navigate = useNavigate();

    const [role, setRole] = useState(null);
    useEffect(() => {
        setRole(getCurrentRole());
    }, []);
    const isRoleLoaded = role !== null;
    const isPic = role === "PIC";
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

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

    const [ruleOptions, setRuleOptions] = useState([]);
    const [picCertCodes, setPicCertCodes] = useState(null);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    const loadRuleOptions = useCallback(async () => {
        if (!isRoleLoaded || isEmployee) return;

        try {
            const rules = await fetchCertificationRules();
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

    useEffect(() => {
        if (!isRoleLoaded) return;
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
    }, [isRoleLoaded, isEmployee]);

    useEffect(() => {
        loadRuleOptions();
    }, [loadRuleOptions]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        setPage(1);
    }, [filterAction, filterRule]);

    const resetFilter = () => {
        setFilterRule(null);
        setFilterAction(actionOptions[0]);
        setPage(1);
        toast.success("Filter dibersihkan");
    };

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

    if (!isRoleLoaded || isEmployee) return null;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold">Histori Aturan Sertifikasi</h1>
                        <p className="text-xs text-gray-500">{totalElements} riwayat perubahan</p>
                    </div>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Aturan Sertifikasi
                        </label>
                        <Select
                            options={ruleOptions}
                            value={filterRule}
                            onChange={setFilterRule}
                            isClearable
                            placeholder="Filter Aturan Sertifikasi"
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Aksi
                        </label>
                        <Select
                            options={actionOptions}
                            value={filterAction}
                            onChange={setFilterAction}
                            placeholder="Filter Aksi"
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="lg:col-span-1"></div>
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
                                <th>Aksi</th>
                                <th>Action At</th>
                                <th>Sertifikasi</th>
                                <th>Jenjang</th>
                                <th>Sub Bidang</th>
                                <th>Masa Berlaku</th>
                                <th>Reminder</th>
                                <th>Wajib Setelah Masuk</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <HistoryIcon size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data histori</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>
                                            <span className="badge badge-info badge-sm text-white">{r.actionType}</span>
                                        </td>
                                        <td className="text-gray-500">{formatDateTime(r.actionAt)}</td>
                                        <td className="font-medium">{r.certificationCode || "-"}</td>
                                        <td>{r.certificationLevelLevel || "-"}</td>
                                        <td>{r.subFieldCode || "-"}</td>
                                        <td>{r.validityMonths != null ? `${r.validityMonths} bulan` : "-"}</td>
                                        <td>{r.reminderMonths != null ? `${r.reminderMonths} bulan` : "-"}</td>
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
        </div>
    );
}
