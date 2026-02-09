import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2, Plus, Building, Filter, Eraser, Search } from "lucide-react";
import Select from "react-select";
import { fetchInstitutions, deleteInstitution } from "../../services/institutionService";
import CreateInstitutionModal from "../../components/institutions/CreateInstitutionModal";
import EditInstitutionModal from "../../components/institutions/EditInstitutionModal";

export default function InstitutionPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: undefined, name: "" });

    const [filter, setFilter] = useState(null);

    async function load() {
        setLoading(true);
        try {
            const list = await fetchInstitutions();
            setRows(list);
        } catch {
            toast.error("Gagal memuat data lembaga");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function onDelete(id) {
        try {
            await deleteInstitution(id);
            toast.success("Institution dihapus");
            load();
        } catch {
            toast.error("Gagal menghapus lembaga");
        }
    }

    // ================== SEARCH HELPER ==================
    const options = useMemo(() => {
        return rows.map((r) => ({
            value: r.id,
            label: r.name,
        }));
    }, [rows]);

    const filteredRows = useMemo(() => {
        if (!filter) return rows;
        return rows.filter((r) => r.id === filter.value);
    }, [rows, filter]);

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
                    <h1 className="text-lg sm:text-xl font-bold">Lembaga Sertifikasi</h1>
                    <p className="text-xs text-gray-500">{rows.length} lembaga</p>
                </div>
                <button
                    className="btn btn-sm btn-primary rounded-lg"
                    onClick={() => setOpenCreate(true)}
                >
                    <Plus size={14} />
                    Tambah Lembaga
                </button>
            </div>

            {/* Filter */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="flex flex-col gap-1 lg:col-span-3">
                        <label className="font-medium text-gray-600 flex items-center gap-1">
                            <Search size={12} /> Cari Lembaga
                        </label>
                        <Select
                            options={options}
                            value={filter}
                            onChange={setFilter}
                            placeholder="Semua Lembaga"
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
                            onClick={() => setFilter(null)}
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
                                <th>Nama</th>
                                <th>Type</th>
                                <th>Alamat</th>
                                <th>Contact Person</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Building size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada data lembaga</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((r, idx) => (
                                    <tr key={r.id} className="hover">
                                        <td>{idx + 1}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <div className="tooltip" data-tip="Edit lembaga">
                                                    <button
                                                        className="btn btn-xs btn-soft btn-warning border border-warning rounded-lg"
                                                        onClick={() => setEditItem(r)}
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                                <div className="tooltip" data-tip="Hapus lembaga">
                                                    <button
                                                        className="btn btn-xs btn-soft btn-error border border-error rounded-lg"
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
                                        <td>{r.type}</td>
                                        <td>{r.address}</td>
                                        <td>{r.contactPerson}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Modals */}
            <CreateInstitutionModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onSaved={() => {
                    setOpenCreate(false);
                    load();
                }}
            />
            <EditInstitutionModal
                open={!!editItem}
                initial={editItem}
                onClose={() => setEditItem(null)}
                onSaved={() => {
                    setEditItem(null);
                    load();
                }}
            />

            {/* Confirm Delete */}
            <dialog className="modal" open={confirm.open}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Hapus Institution?</h3>
                    {confirm.name && (
                        <p className="py-3">
                            Yakin mau hapus <b>{confirm.name}</b>?
                        </p>
                    )}
                    <div className="modal-action">
                        <button className="btn" onClick={() => setConfirm({ open: false, id: undefined, name: "" })}>
                            Batal
                        </button>
                        <button
                            className="btn btn-error"
                            onClick={() => {
                                onDelete(confirm.id);
                                setConfirm({ open: false, id: undefined, name: "" });
                            }}
                        >
                            Hapus
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
