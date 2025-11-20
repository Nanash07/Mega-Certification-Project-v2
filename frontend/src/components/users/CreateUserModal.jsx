import { useState } from "react";
import toast from "react-hot-toast";
import { createUser } from "../../services/userService";

export default function CreateUserModal({ open, onClose, roles, onSaved }) {
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        roleId: "",
        isActive: true,
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : name === "roleId"
                    ? Number(value)
                    : name === "isActive"
                    ? value === "true"
                    : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createUser(form);
            toast.success("User berhasil dibuat");
            onSaved();
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Gagal membuat user");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <dialog open className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">Tambah User</h3>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Username */}
                    <div>
                        <label htmlFor="username" className="block mb-1">
                            Username
                        </label>
                        <input
                            id="username"
                            className="input input-bordered w-full"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="Masukkan username"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            className="input input-bordered w-full"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Masukkan email"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            className="input input-bordered w-full"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Masukkan password"
                            required
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label htmlFor="roleId" className="block mb-1">
                            Role
                        </label>
                        <select
                            id="roleId"
                            className="select select-bordered w-full"
                            name="roleId"
                            value={form.roleId}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Pilih Role</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Aktif */}
                    <div>
                        <label htmlFor="isActive" className="block mb-1">
                            Status
                        </label>
                        <select
                            id="isActive"
                            className="select select-bordered w-full"
                            name="isActive"
                            value={form.isActive ? "true" : "false"}
                            onChange={handleChange}
                        >
                            <option value="true">Aktif</option>
                            <option value="false">Tidak Aktif</option>
                        </select>
                    </div>

                    {/* Spacer biar grid rapih */}
                    <div className="hidden md:block" />

                    {/* Action buttons full width, span 2 kolom */}
                    <div className="modal-action col-span-1 md:col-span-2">
                        <button type="button" className="btn" onClick={onClose}>
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
}
