import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";
import api from "../../services/api";
import { ArrowLeft } from "lucide-react";

export default function EmployeeCertificationHistoryPage() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filter aksi — default: tidak ter-filter (null)
    const [filterAction, setFilterAction] = useState(null);

    async function load() {
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

    // Format tanggal
    const formatDate = (val, withTime = false) => {
        if (!val) return "-";
        return new Date(val).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            ...(withTime && { hour: "2-digit", minute: "2-digit" }),
        });
    };

    return (
        <div className="p-4">
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                <div className="flex justify-start mb-3">
                    <button onClick={() => navigate(-1)} className="btn btn-accent btn-sm flex items-center gap-2">
                        <ArrowLeft size={16} /> Kembali
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                    {/* Filter aksi */}
                    <div className="col-span-1">
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
                        />
                    </div>

                    <div className="col-span-4"></div>

                    {/* Clear Filter */}
                    <div className="col-span-1">
                        <button
                            className="btn btn-soft btn-accent border-accent btn-sm w-full"
                            onClick={() => {
                                setFilterAction(null); // balik ke tidak ter-filter
                                setPage(1);
                                toast.success("Filter direset");
                            }}
                        >
                            Clear Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra text-xs">
                    <thead className="bg-base-200">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>Waktu</th>
                            <th>Nomor Sertifikat</th>
                            <th>Tanggal</th>
                            <th>Berlaku Sampai</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((h, idx) => (
                                <tr key={h.id || idx}>
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
