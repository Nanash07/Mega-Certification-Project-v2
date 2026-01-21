// src/components/users/EditUserModal.jsx
import { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import { X, Save, Pencil, User, Mail, Lock, Shield, CheckCircle } from "lucide-react";
import { updateUser } from "../../services/userService";

export default function EditUserModal({ open, onClose, roles, initial, onSaved }) {
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        roleId: "",
        isActive: true,
    });
    const [loading, setLoading] = useState(false);

    const selectStyles = useMemo(
        () => ({
            menuPortal: (base) => ({ ...base, zIndex: 999999 }),
            menu: (base) => ({ ...base, zIndex: 999999 }),
            control: (base, state) => ({
                ...base,
                minHeight: "36px",
                fontSize: "0.875rem",
                borderRadius: "0.5rem",
                borderColor: "#d1d5db",
                boxShadow: state.isFocused ? "0 0 0 1px var(--fallback-p,oklch(var(--p)/1))" : "none",
                "&:hover": {
                    borderColor: "var(--fallback-p,oklch(var(--p)/1))",
                },
            }),
            option: (base, state) => ({
                ...base,
                padding: "8px 12px",
                fontSize: "0.875rem",
                backgroundColor: state.isFocused ? "#f3f4f6" : "white",
                color: "#1f2937",
                cursor: "pointer",
            }),
        }),
        []
    );

    useEffect(() => {
        if (initial) {
            setForm({
                username: initial.username || "",
                email: initial.email || "",
                password: "",
                roleId: initial.roleId || "",
                isActive: initial.isActive ?? true,
            });
        }
    }, [initial]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateUser(initial.id, form);
            toast.success("User berhasil diperbarui");
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Gagal update user");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));
    const statusOptions = [
        { value: true, label: "Aktif" },
        { value: false, label: "Tidak Aktif" },
    ];

    return (
        <dialog className="modal modal-open" open={open}>
            <div className="modal-box max-w-2xl bg-base-100 shadow-2xl rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <Pencil size={20} className="text-warning" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Edit User</h3>
                            <p className="text-xs text-gray-500">Ubah data akun pengguna</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="py-5 text-sm">
                    <form id="edit-user-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Username */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <User size={14} /> Username
                            </label>
                            <input
                                name="username"
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.username}
                                onChange={handleChange}
                                placeholder="Username"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Mail size={14} /> Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Email"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Lock size={14} /> Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Kosongkan jika tidak diubah"
                            />
                        </div>

                        {/* Role */}
                        <div className="flex flex-col gap-1">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <Shield size={14} /> Role
                            </label>
                            <Select
                                options={roleOptions}
                                value={roleOptions.find((opt) => opt.value === form.roleId) || null}
                                onChange={(opt) => setForm({ ...form, roleId: opt ? opt.value : "" })}
                                styles={selectStyles}
                                placeholder="Pilih Role"
                                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                                required
                            />
                        </div>

                        {/* Status Aktif */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="font-medium text-gray-600 flex items-center gap-1">
                                <CheckCircle size={14} /> Status
                            </label>
                            <Select
                                options={statusOptions}
                                value={statusOptions.find((opt) => opt.value === form.isActive)}
                                onChange={(opt) => setForm({ ...form, isActive: opt.value })}
                                styles={selectStyles}
                                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        className="btn btn-sm btn-ghost rounded-lg border border-gray-200"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="edit-user-form"
                        className="btn btn-sm btn-primary rounded-lg gap-1"
                        disabled={loading}
                    >
                        {loading ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />}
                        {loading ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop bg-black/50">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}