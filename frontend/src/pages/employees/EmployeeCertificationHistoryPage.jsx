import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";

import { getCurrentRole } from "../../utils/helpers";
import api from "../../services/api";
import { ArrowLeft, Filter, Eraser, History as HistoryIcon } from "lucide-react";

export default function EmployeeCertificationHistoryPage() {

    const navigate = useNavigate();

    const [role, setRole] = useState(null);
    const isRoleLoaded = role !== null;
    const isEmployee = role === "EMPLOYEE" || role === "PEGAWAI";

    useEffect(() => {
        setRole(getCurrentRole());
    }, []);

    useEffect(() => {
        if (!isRoleLoaded) return;
        if (isEmployee) {
            toast.error("Anda tidak berwenang mengakses halaman ini");
            navigate("/", { replace: true });
        }
    }, [isRoleLoaded, isEmployee]);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [filterAction, setFilterAction] = useState(null);

    async function load() {
        if (!isRoleLoaded || isEmployee) return;

        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
            };
            if (filterAction?.value) {
                params.actionType = filterAction.value;
            }

            const res = await api.get(`/employee-certification-histories`, { params });
            const data = res?.data || {};

            setRows(data.content || []);
            setTotalPages(data.totalPages || 1);
            setTotalElements(data.totalElements || 0);
        } catch (err) {
            console.error("load histories error:", err);
            toast.error("Gagal memuat histori sertifikasi pegawai");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [page, rowsPerPage, filterAction]);

    useEffect(() => {
        setPage(1);
    }, [filterAction]);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    const formatDate = (val, withTime = false) => {
        if (!val) return "-";
        return new Date(val).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            ...(withTime && { hour: "2-digit", minute: "2-digit" }),
        });
    };

    function resetFilter() {
        setFilterAction(null);
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
                        <h1 className="text-lg sm:text-xl font-bold">Histori Sertifikasi Pegawai</h1>
                        <p className="text-xs text-gray-500">{totalElements} riwayat perubahan</p>
                    </div>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Filter size={12} /> Jenis Aksi
                        </label>
                        <Select
                            options={[
                                { value: "CREATED", label: "CREATED" },
                                { value: "UPDATED", label: "UPDATED" },
                                { value: "DELETED", label: "DELETED" },
                            ]}
                            value={filterAction}
                            onChange={setFilterAction}
                            placeholder="Filter Aksi"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1 lg:col-span-4">
                        {/* spacer */}
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <button className="btn btn-sm btn-accent btn-soft rounded-lg flex gap-2 w-full" onClick={resetFilter}>
                            <Eraser size={14} />
                            Clear Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra text-xs w-full">
                        <thead className="bg-base-200">
                            <tr>
                                <th className="w-12">No</th>
                                <th className="w-24">Aksi</th>
                                <th>Waktu</th>
                                <th>Nomor Sertifikat</th>
                                <th>Tanggal</th>
                                <th>Berlaku Sampai</th>
                                <th className="w-24">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <HistoryIcon size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data histori</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((h, idx) => (
                                    <tr key={h.id || idx} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td>
                                            <span className="badge badge-info badge-sm text-white">{h.actionType}</span>
                                        </td>
                                        <td>{formatDate(h.actionAt, true)}</td>
                                        <td>{h.certNumber || "-"}</td>
                                        <td>{formatDate(h.certDate)}</td>
                                        <td>{formatDate(h.validUntil)}</td>
                                        <td>
                                            <span
                                                className={`badge badge-sm text-white ${
                                                    h.status === "ACTIVE"
                                                        ? "badge-success"
                                                        : h.status === "EXPIRED"
                                                        ? "badge-error"
                                                        : h.status === "DUE"
                                                        ? "badge-warning"
                                                        : "badge-neutral"
                                                }`}
                                            >
                                                {h.status}
                                            </span>
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
