import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { Trash2, Building2, Filter, Eraser, Search } from "lucide-react";
import AsyncSelect from "react-select/async";
import { fetchDivisions, toggleDivision } from "../../services/divisionService";
import Pagination from "../../components/common/Pagination";

export default function DivisionPage() {
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
        fetchDivisions({ page: 0, size: 20 })
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
            const res = await fetchDivisions(apiParams);
            setRows(res.content);
            setTotalPages(res.totalPages);
            setTotalElements(res.totalElements);
        } catch {
            toast.error("Gagal memuat data division");
        } finally {
            setLoading(false);
        }
    }

    // Handlers
    async function onToggle(id) {
        try {
            await toggleDivision(id);
            toast.success("Status division diupdate");
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

    const resetFilter = () => {
        setFilter(null);
        setPage(1);
        toast.success("Filter dibersihkan");
    };

    // Load options for AsyncSelect
    const loadOptions = (inputValue, callback) => {
        fetchDivisions({ page: 0, size: 20, q: inputValue })
            .then((res) => {
                const list = res.content || [];
                const options = list.map((r) => ({ value: r.id, label: r.name }));
                callback(options);
            })
            .catch(() => callback([]));
    };

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Building2 size={20} className="text-secondary" />
                    <h1 className="text-lg sm:text-xl font-bold">Data Divisi</h1>
                </div>
                <button
                    className="btn btn-sm btn-primary rounded-lg"
                    onClick={() => { /* setIsAddModalOpen(true) */ }} // Placeholder for actual modal open logic
                >
                    <Plus size={16} />
                    Tambah Divisi
                </button>
            </div>

            {/* Filter Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs w-full">
                    <div className="flex flex-col gap-1 w-full">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Search size={12} /> Cari Divisi
                        </label>
                        <AsyncSelect
                            cacheOptions
                            loadOptions={loadOptions}
                            defaultOptions
                            value={filter}
                            onChange={(val) => {
                                setPage(1);
                                setFilter(val);
                            }}
                            placeholder="Ketik nama divisi..."
                            isClearable
                            className="text-xs"
                            styles={selectStyles}
                            noOptionsMessage={() => "Tidak ditemukan"}
                            loadingMessage={() => "Mencari..."}
                        />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="font-medium text-gray-600 invisible">.</label>
                        <div className="flex gap-2">
                            <button
                                className="btn btn-sm btn-accent btn-soft rounded-lg flex gap-2"
                                onClick={resetFilter}
                            >
                                <Eraser size={14} />
                                Clear Filter
                            </button>
                        </div>
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
                                <th>Nama Division</th>
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
                                            <Building2 size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data division</p>
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
                <div className="p-4 border-t border-gray-100 flex justify-end">
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            «
                        </button>
                        <button className="join-item btn btn-sm bg-base-100 no-animation">
                            Page {page} of {totalPages}
                        </button>
                        <button
                            className="join-item btn btn-sm"
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            »
                        </button>
                    </div>
                </div>
            </div>



            {/* Confirm Actions */}
            <dialog className="modal" open={confirm.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Konfirmasi Aksi</h3>
                    {confirm.name && (
                        <p className="py-3">
                            Ubah status division <b>{confirm.name}</b>?
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

