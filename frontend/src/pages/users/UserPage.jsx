import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import Pagination from "../../components/common/Pagination";
import { fetchUsers, deleteUser, toggleUser, fetchActiveUsers } from "../../services/userService";
import { fetchRoles } from "../../services/roleService";
import CreateUserModal from "../../components/users/CreateUserModal";
import EditUserModal from "../../components/users/EditUserModal";
import { Pencil, Trash2, ChevronDown, Plus, Eraser, Target } from "lucide-react";

export default function UserPage() {
    // ===================== STATE =====================
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [roles, setRoles] = useState([]);
    const [filterUser, setFilterUser] = useState(null);
    const [filterRole, setFilterRole] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null });

    // floating menu status (Active / Nonactive)
    const [statusMenu, setStatusMenu] = useState(null);

    // ===================== LOAD ROLES =====================
    useEffect(() => {
        fetchRoles()
            .then(setRoles)
            .catch(() => toast.error("Gagal memuat role"));
    }, []);

    // ===================== LOAD USERS =====================
    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: rowsPerPage,
                roleId: filterRole?.value || undefined,
                isActive: filterStatus?.value === "all" ? undefined : filterStatus?.value ?? undefined,
                q: filterUser?.label || undefined,
            };

            const res = await fetchUsers(params);
            setRows(res.content || []);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || 0);
        } catch {
            toast.error("Gagal memuat data user");
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterUser, filterRole, filterStatus]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // ===================== ASYNC SEARCH USER =====================
    const loadUserOptions = async (inputValue) => {
        try {
            const users = await fetchActiveUsers(inputValue);
            return users.slice(0, 20).map((u) => ({
                value: u.id,
                label: `${u.username}${u.employeeName ? ` - ${u.employeeName}` : ""}`,
            }));
        } catch {
            return [];
        }
    };

    // ===================== STATUS STYLE =====================
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

    async function handleChangeStatus(row, newIsActive) {
        if (row.isActive === newIsActive) return;

        try {
            // toggleUser diasumsikan flip status
            const updated = await toggleUser(row.id);
            toast.success(`User ${updated.isActive ? "diaktifkan" : "dinonaktifkan"}`);
            loadUsers();
        } catch {
            toast.error("Gagal mengubah status user");
        }
    }

    // ===================== HANDLERS =====================
    async function onDelete(id) {
        try {
            await deleteUser(id);
            toast.success("User dihapus");
            loadUsers();
        } catch {
            toast.error("Gagal menghapus user");
        }
    }

    const resetFilter = () => {
        setFilterUser(null);
        setFilterRole(null);
        setFilterStatus(null);
        setPage(1);
        toast.success("Filter direset");
    };

    const startIdx = totalElements === 0 ? 0 : (page - 1) * rowsPerPage + 1;

    // ===================== UI =====================
    return (
        <div>
            {/* Toolbar */}
            <div className="mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
                    <AsyncSelect
                        cacheOptions
                        defaultOptions
                        loadOptions={loadUserOptions}
                        value={filterUser}
                        onChange={setFilterUser}
                        placeholder="Cari User"
                        isClearable
                    />

                    <Select
                        options={roles.map((r) => ({ value: r.id, label: r.name }))}
                        value={filterRole}
                        onChange={setFilterRole}
                        placeholder="Filter Role"
                        isClearable
                    />

                    <Select
                        options={[
                            { value: "all", label: "Semua Status" },
                            { value: true, label: "Aktif" },
                            { value: false, label: "Nonaktif" },
                        ]}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        placeholder="Filter Status"
                        isClearable
                    />

                    <button
                        className="btn btn-sm btn-primary w-full"
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Tambah User
                    </button>

                    <button
                        className="btn btn-sm btn-info w-full"
                        type="button"
                        onClick={() => navigate("/mapping/pic-certification-scope")}
                    >
                        <Target className="w-4 h-4" />
                        Kelola PIC Scope
                    </button>

                    <button
                        className="btn btn-sm btn-accent btn-soft border-accent w-full"
                        type="button"
                        onClick={resetFilter}
                    >
                        <Eraser className="w-4 h-4" />
                        Clear Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra">
                    <thead className="bg-base-200 text-xs">
                        <tr>
                            <th>No</th>
                            <th>Aksi</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Nama Pegawai</th>
                            <th>NIP</th>
                            <th>Status</th>
                            <th>Role</th>
                            <th>Updated At</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="text-center py-10">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center text-gray-400 py-10">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            rows.map((u, idx) => (
                                <tr key={u.id}>
                                    <td>{startIdx + idx}</td>
                                    <td className="whitespace-nowrap">
                                        <div className="flex gap-2">
                                            <div className="tooltip" data-tip="Edit user">
                                                <button
                                                    type="button"
                                                    className="btn btn-warning btn-soft btn-xs border border-warning"
                                                    onClick={() => setEditData(u)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="tooltip" data-tip="Hapus user">
                                                <button
                                                    type="button"
                                                    className="btn btn-error btn-soft btn-xs border border-error"
                                                    onClick={() => setConfirm({ open: true, id: u.id })}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{u.username}</td>
                                    <td>{u.email || "-"}</td>
                                    <td>{u.employeeName || "-"}</td>
                                    <td>{u.employeeNip || "-"}</td>
                                    <td>{renderStatusBadge(u)}</td>
                                    <td>{u.roleName || "-"}</td>
                                    <td>
                                        {u.updatedAt
                                            ? new Date(u.updatedAt).toLocaleDateString("id-ID", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                              })
                                            : "-"}
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

            {/* Modals */}
            {showCreateModal && (
                <CreateUserModal
                    open={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSaved={loadUsers}
                    roles={roles}
                />
            )}
            {editData && (
                <EditUserModal
                    open={!!editData}
                    onClose={() => setEditData(null)}
                    onSaved={loadUsers}
                    roles={roles}
                    initial={editData}
                />
            )}

            {/* Modal Delete */}
            {confirm.open && (
                <dialog className="modal" open={confirm.open}>
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Hapus User?</h3>
                        <p className="py-2">User ini akan dihapus dari sistem.</p>
                        <div className="modal-action">
                            <button className="btn" onClick={() => setConfirm({ open: false, id: null })}>
                                Batal
                            </button>
                            <button
                                className="btn btn-error"
                                onClick={async () => {
                                    await onDelete(confirm.id);
                                    setConfirm({ open: false, id: null });
                                }}
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setConfirm({ open: false, id: null })}>close</button>
                    </form>
                </dialog>
            )}

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
