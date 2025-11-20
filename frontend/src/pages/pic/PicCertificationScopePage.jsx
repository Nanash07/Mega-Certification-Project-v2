import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchPicScopes } from "../../services/picScopeService";
import ManageScopeModal from "../../components/pic/ManageScopeModal";

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
        <div className="p-4 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
                <table className="table table-zebra text-xs">
                    <thead className="bg-base-200 text-xs">
                        <tr>
                            <th>No.</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Certifications</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-10 text-center">
                                    <span className="loading loading-dots loading-md" />
                                </td>
                            </tr>
                        ) : scopes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-gray-400 py-10">
                                    Tidak ada PIC
                                </td>
                            </tr>
                        ) : (
                            scopes.map((s, idx) => (
                                <tr key={s.userId}>
                                    <td>{idx + 1}</td>
                                    <td>{s.username}</td>
                                    <td>{s.email || "-"}</td>
                                    <td>
                                        {!s.certifications || s.certifications.length === 0
                                            ? "-"
                                            : s.certifications.map((c) => c.certificationCode).join(", ")}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-xs btn-outline btn-info"
                                            onClick={() => setManageUser(s)}
                                        >
                                            Kelola Scope
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
