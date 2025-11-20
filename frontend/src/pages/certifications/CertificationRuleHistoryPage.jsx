import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import Pagination from "../../components/common/Pagination";
import { fetchCertificationRuleHistories } from "../../services/certificationRuleHistoryService";
import { ArrowLeft } from "lucide-react";

export default function CertificationRuleHistoryPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // options dibikin constant biar ga nulis ulang
    const actionOptions = useMemo(
        () => [
            { value: "all", label: "Semua Aksi" },
            { value: "CREATED", label: "CREATED" },
            { value: "UPDATED", label: "UPDATED" },
            { value: "DELETED", label: "DELETED" },
        ],
        []
    );

    // Filters
    const [filterAction, setFilterAction] = useState(actionOptions[0]);

    async function load() {
        setLoading(true);
        try {
            const params = {
                ruleId: id,
                page: page - 1,
                size: rowsPerPage,
                actionType: filterAction?.value || "all",
            };
            const res = await fetchCertificationRuleHistories(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch (err) {
            console.error("load histories error:", err);
            toast.error("❌ Gagal memuat histori aturan sertifikasi");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, page, rowsPerPage, filterAction]);

    useEffect(() => {
        setPage(1);
    }, [filterAction]);

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    const formatDate = (dateStr, withTime = true) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            ...(withTime && { hour: "2-digit", minute: "2-digit" }),
        });
    };

    // handler khusus biar clear filter selalu balik ke "Semua Aksi"
    const handleChangeAction = (option) => {
        if (!option) {
            setFilterAction(actionOptions[0]); // reset ke default
        } else {
            setFilterAction(option);
        }
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
                            options={actionOptions}
                            value={filterAction}
                            onChange={handleChangeAction}
                            placeholder="Filter Aksi"
                            isClearable
                        />
                    </div>

                    <div className="col-span-1"></div>
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
                                    <td>{formatDate(r.actionAt)}</td>
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
