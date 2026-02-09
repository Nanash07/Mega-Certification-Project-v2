import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { Trash2, MapPin, Filter, Eraser, Search } from "lucide-react";
import Select from "react-select";
import { fetchRegionals, toggleRegional } from "../../services/regionalService";
import Pagination from "../../components/common/Pagination";

export default function RegionalPage() {
    // Table State
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 10;

    // Filter State
    const [filter, setFilter] = useState(null);

    // Options for Select
    const [options, setOptions] = useState([]);
    const [isOptionsLoading, setIsOptionsLoading] = useState(false);

    // Confirm dialog
    const [confirm, setConfirm] = useState({ open: false, id: undefined, name: "" });

    // Fetch Options (Pre-load for Select)
    useEffect(() => {
        setIsOptionsLoading(true);
        fetchRegionals({ page: 0, size: 20 })
            .then((res) => {
                const list = res.content || [];
                setOptions(list.map((r) => ({ value: r.id, label: r.name })));
            })
            .catch((err) => console.error(err))
            .finally(() => setIsOptionsLoading(false));
    }, []);

    // API Params for Table
    const apiParams = useMemo(() => {
        return {
            page: page - 1,
            size: pageSize,
            q: filter?.label || "", // Search by name (label)
        };
    }, [page, filter]);

    // Load Table Data
    useEffect(() => {
        load();
    }, [apiParams]);

    async function load() {
        setLoading(true);
        try {
            const res = await fetchRegionals(apiParams);
            setRows(res.content);
            setTotalPages(res.totalPages);
            setTotalElements(res.totalElements);
        } catch {
            toast.error("Gagal memuat data regional");
        } finally {
            setLoading(false);
        }
    }

    async function onToggle(id) {
        try {
            await toggleRegional(id);
            toast.success("Status regional diupdate");
            load();
        } catch {
            toast.error("Gagal update status");
        }
    }

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

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Regional</h1>
                    <p className="text-xs text-gray-500">{totalElements} regional ditemukan</p>
                </div>
            </div>

            {/* Filter */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="flex flex-col gap-1 lg:col-span-3">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Search size={12} /> Cari Regional
                        </label>
                        <Select
                            styles={selectStyles}
                            options={options}
                            isLoading={isOptionsLoading}
                            value={filter}
                            onChange={(val) => {
                                setPage(1);
                                setFilter(val);
                            }}
                            placeholder="Semua Regional"
                            isClearable
                            className="text-xs"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                         <label className="font-medium text-gray-600 invisible">.</label>
                         <button
                            className="btn btn-sm btn-accent btn-soft w-full flex gap-2 rounded-lg"
                            onClick={() => {
                                setPage(1);
                                setFilter(null);
                            }}
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
                                <th>Nama Regional</th>
                                <th>Status</th>
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
                                            <MapPin size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data regional</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id} className="hover">
                                        <td>{(page - 1) * pageSize + idx + 1}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <div className="tooltip" data-tip={r.isActive ? "Nonaktifkan" : "Aktifkan"}>
                                                    <button
                                                        className={`btn btn-xs btn-soft rounded-lg border ${
                                                            r.isActive
                                                                ? "btn-error border-error"
                                                                : "btn-success border-success"
                                                        }`}
                                                        onClick={() =>
                                                            setConfirm({
                                                                open: true,
                                                                id: r.id,
                                                                name: r.name,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-medium">{r.name}</td>
                                        <td>
                                            <span
                                                className={`badge badge-sm ${
                                                    r.isActive ? "badge-success text-white" : "badge-error text-white"
                                                }`}
                                            >
                                                {r.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {rows.length > 0 && (
                    <div className="border-t border-gray-100 p-3">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalElements={totalElements}
                            rowsPerPage={pageSize}
                            onPageChange={setPage}
                            onRowsPerPageChange={(val) => {
                                // This component doesn't allow changing rowsPerPage, but keeping the prop for consistency
                                // setRowsPerPage(val);
                                setPage(1);
                            }}
                        />
                    </div>
                )}
            </div>



            {/* Confirm Actions */}
            <dialog className="modal" open={confirm.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Konfirmasi Aksi</h3>
                    {confirm.name && (
                        <p className="py-3">
                            Ubah status regional <b>{confirm.name}</b>?
                        </p>
                    )}
                    <div className="modal-action">
                        <button className="btn" onClick={() => setConfirm({ open: false, id: undefined, name: "" })}>
                            Batal
                        </button>
                        <button
                            className="btn btn-warning"
                            onClick={() => {
                                onToggle(confirm.id);
                                setConfirm({ open: false, id: undefined, name: "" });
                            }}
                        >
                            Ya, Ubah
                        </button>
                    </div>
                </div>
                <form
                    method="dialog"
                    className="modal-backdrop"
                    onSubmit={() => setConfirm({ open: false, id: undefined, name: "" })}
                >
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}
