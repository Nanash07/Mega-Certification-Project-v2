import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchPicScopes } from "../../services/picScopeService";
import ManageScopeModal from "../../components/pic/ManageScopeModal";
import { Target, Settings } from "lucide-react";

export default function PicCertificationScopePage() {
    const [scopes, setScopes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [manageUser, setManageUser] = useState(null);

    async function loadScopes() {
        setLoading(true);
        try {
            const data = await fetchPicScopes();
            setScopes(data);
        } catch (e) {
            console.error("Gagal memuat PIC scope:", e);
            toast.error("Gagal memuat PIC scope");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadScopes();
    }, []);

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Kelola PIC Scope</h1>
                    <p className="text-xs text-gray-500">{scopes.length} PIC terdaftar</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead className="bg-base-200 text-xs">
                            <tr>
                                <th className="w-12">No</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Sertifikasi</th>
                                <th className="w-32">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <span className="loading loading-dots loading-lg text-primary" />
                                    </td>
                                </tr>
                            ) : scopes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Target size={48} className="mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada PIC terdaftar</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                scopes.map((s, idx) => (
                                    <tr key={s.userId} className="hover">
                                        <td>{idx + 1}</td>
                                        <td className="font-medium">{s.username}</td>
                                        <td>{s.email || "-"}</td>
                                        <td>
                                            {!s.certifications || s.certifications.length === 0
                                                ? "-"
                                                : s.certifications.map((c) => c.certificationCode).join(", ")}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-xs btn-info btn-soft border border-info rounded-lg flex gap-1"
                                                onClick={() => setManageUser(s)}
                                            >
                                                <Settings size={12} />
                                                Kelola Scope
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manage Scope Modal */}
            {manageUser && (
                <ManageScopeModal
                    open={!!manageUser}
                    onClose={() => setManageUser(null)}
                    user={manageUser}
                    onSaved={loadScopes}
                />
            )}
        </div>
    );
}
