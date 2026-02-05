import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { fetchUnits, toggleUnit } from "../../services/unitService";
import Pagination from "../../components/common/Pagination";
import { ChevronDown, Search, Eraser, Boxes } from "lucide-react";

export default function UnitPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filter, setFilter] = useState(null);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [statusMenu, setStatusMenu] = useState(null);

    // Options for Select
    const [options, setOptions] = useState([]);
    const [isOptionsLoading, setIsOptionsLoading] = useState(false);

    const apiParams = useMemo(
        () => ({ q: filter?.label || undefined, page: page - 1, size: rowsPerPage }),
        [filter, page, rowsPerPage]
    );

    async function load() {
        setLoading(true);
        try {
            const data = await fetchUnits(apiParams);
            setRows(data.content || []);
            setTotalPages(Math.max(data.totalPages || 1, 1));
            setTotalElements(data.totalElements ?? data.content?.length ?? 0);
        } catch {
            toast.error("Gagal memuat unit");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [apiParams]);

    // Fetch options on mount (Pre-load for Select)
    useEffect(() => {
        setIsOptionsLoading(true);
        fetchUnits({ q: undefined, page: 0, size: 20 })
            .then((data) => {
                const list = data.content || [];
                setOptions(list.map((u) => ({ value: u.id, label: u.name })));
            })
            .catch((err) => console.error(err))
            .finally(() => setIsOptionsLoading(false));
    }, []);

    // ================== STYLES ==================
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

    function getStatusStyle(isActive) {
        if (isActive) {
            return { label: "Active", badgeCls: "badge-success", btnCls: "btn-success" };
        }
        return { label: "Nonactive", badgeCls: "badge-warning", btnCls: "btn-warning" };
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

    async function handleChangeStatus(row, newIsActive) {
        if (row.isActive === newIsActive) return;
        try {
            await toggleUnit(row.id);
            toast.success(`Unit berhasil di${newIsActive ? "aktifkan" : "nonaktifkan"}`);
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal update status unit");
        }
    }

    const clearFilter = () => {
        setFilter(null);
        setPage(1);
        toast.success("Filter dibersihkan");
    };

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Kelola Unit</h1>
                    <p className="text-xs text-gray-500">{totalElements} unit terdaftar</p>
                </div>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="flex flex-col gap-1 lg:col-span-3">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Search size={12} /> Cari Unit
                        </label>
                        <Select
                            options={options}
                            isLoading={isOptionsLoading}
                            value={filter}
                            onChange={(val) => {
                                setPage(1);
                                setFilter(val);
                            }}
                            placeholder="Ketik nama unit..."
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                            styles={selectStyles}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <button
                            className="btn btn-sm btn-accent btn-soft w-full flex gap-2 rounded-lg"
                            onClick={clearFilter}
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
                                <th>Nama Unit</th>
                                <th className="w-28">Status</th>
                                <th className="w-32">Updated At</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Boxes size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data unit</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((u, idx) => (
                                    <tr key={u.id} className="hover">
                                        <td>{startIdx + idx}</td>
                                        <td className="font-medium">{u.name}</td>
                                        <td>{renderStatusBadge(u)}</td>
                                        <td className="text-gray-500">
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

            {/* Floating status menu */}
            {statusMenu && (
                <div className="fixed inset-0 z-[999]" onClick={() => setStatusMenu(null)}>
                    <div
                        className="absolute"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-xl border border-gray-200 p-2 text-xs flex flex-col gap-1.5">
                            {[true, false].map((val) => {
                                const { label, btnCls } = getStatusStyle(val);
                                return (
                                    <button
                                        key={String(val)}
                                        className={`btn btn-xs ${btnCls} text-white rounded-lg w-full justify-center`}
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
