import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { fetchUnits, toggleUnit } from "../../services/unitService";
import Pagination from "../../components/common/Pagination";
import { ChevronDown } from "lucide-react";

export default function UnitPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // floating menu untuk ganti status (Active/Nonactive)
    const [statusMenu, setStatusMenu] = useState(null);

    const apiParams = useMemo(
        () => ({
            q: q?.trim() || undefined,
            page: page - 1, // BE 0-based
            size: rowsPerPage,
        }),
        [q, page, rowsPerPage]
    );

    async function load() {
        setLoading(true);
        try {
            const data = await fetchUnits(apiParams);
            setRows(data.content || []);
            setTotalPages(Math.max(data.totalPages || 1, 1));
            setTotalElements(data.totalElements ?? data.content?.length ?? 0);
        } catch {
            toast.error("❌ Gagal memuat unit");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [apiParams]);

    async function onToggle(id) {
        try {
            await toggleUnit(id);
            toast.success("✅ Status unit berhasil diperbarui");
            load();
        } catch (err) {
            const msg = err?.response?.data?.message || "❌ Gagal update status unit";
            toast.error(msg);
        }
    }

    // helper style status
    function getStatusStyle(isActive) {
        if (isActive) {
            return {
                label: "Active",
                badgeCls: "badge-success",
                btnCls: "btn-success",
            };
        }
        return {
            label: "Nonactive",
            badgeCls: "badge-warning",
            btnCls: "btn-warning",
        };
    }

    // badge status yang bisa diklik
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

    // ganti status dari floating menu
    async function handleChangeStatus(row, newIsActive) {
        if (row.isActive === newIsActive) return;

        try {
            // toggleUnit diasumsikan flip status
            await toggleUnit(row.id);
            toast.success(`✅ Unit berhasil di${newIsActive ? "aktifkan" : "nonaktifkan"}`);
            load();
        } catch (err) {
            const msg = err?.response?.data?.message || "❌ Gagal update status unit";
            toast.error(msg);
        }
    }

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div>
            {/* 🔍 Toolbar */}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
                <div className="flex-1 min-w-[16rem]">
                    <label className="label pb-1 font-semibold">Search</label>
                    <input
                        className="input input-bordered w-full"
                        value={q}
                        onChange={(e) => {
                            setPage(1);
                            setQ(e.target.value);
                        }}
                        placeholder="Cari Unit…"
                    />
                </div>
            </div>

            {/* 📋 Tabel */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra text-xs">
                    <thead className="bg-base-200 text-xs">
                        <tr>
                            <th>No</th>
                            <th>Nama Unit</th>
                            <th>Status</th>
                            <th>Updated At</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((u, idx) => (
                                <tr key={u.id}>
                                    <td>{startIdx + idx}</td>
                                    <td>{u.name}</td>
                                    <td>{renderStatusBadge(u)}</td>
                                    <td>
                                        {u.createdAt
                                            ? new Date(u.createdAt).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "-"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 📄 Pagination (seragam) */}
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

            {/* Floating status menu */}
            {statusMenu && (
                <div className="fixed inset-0 z-[999]" onClick={() => setStatusMenu(null)}>
                    <div
                        className="absolute"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-2xl p-3 text-xs flex flex-col gap-2">
                            {[true, false].map((val) => {
                                const { label, btnCls } = getStatusStyle(val);
                                return (
                                    <button
                                        key={String(val)}
                                        className={`btn btn-xs ${btnCls} text-white rounded-full w-full justify-center`}
                                        onClick={async () => {
                                            await handleChangeStatus(statusMenu.row, val);
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
