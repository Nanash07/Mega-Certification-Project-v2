import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

/* ---------- utils ---------- */
const fmtID = (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");
const STATUS_CLASS = {
    ACTIVE: "badge badge-success",
    DUE: "badge badge-warning",
    EXPIRED: "badge badge-error",
    PENDING: "badge badge-info",
    INVALID: "badge",
};

/** Simple badge with status color */
function StatusBadge({ value }) {
    const cls = STATUS_CLASS[value] || "badge";
    return <span className={cls}>{value || "-"}</span>;
}

/* ---------- Page ---------- */
export default function EmployeeDashboard() {
    const navigate = useNavigate();
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);

    // data states
    const [myCerts, setMyCerts] = useState([]); // employee_certifications
    const [myMusts, setMyMusts] = useState([]); // employee_eligibilities NOT_YET_CERTIFIED
    const [mySchedule, setMySchedule] = useState([]); // employee_batches + batches
    const [loading, setLoading] = useState(true);

    async function loadAll() {
        setLoading(true);
        try {
            // **FE expects this shape** from BE:
            // GET /dashboard/me?sections=certs,eligibilities,schedule
            // -> { certs: [...], musts: [...], schedule: [...] }
            // (auth menentukan current_user)
            const { data } = await api.get("/dashboard/me", {
                params: { sections: "certs,eligibilities,schedule" },
            });

            setMyCerts(Array.isArray(data?.certs) ? data.certs : []);
            setMyMusts(Array.isArray(data?.musts) ? data.musts : []);
            setMySchedule(Array.isArray(data?.schedule) ? data.schedule : []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
    }, []);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Dashboard Pegawai</h1>
                <p className="text-sm opacity-70">Halo{user?.name ? `, ${user.name}` : ""} — ringkasan untuk kamu</p>
            </div>

            {/* Sertifikasi Saya */}
            <div className="card bg-base-100 border rounded-2xl shadow-sm">
                <div className="card-body p-4 md:p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="card-title text-base md:text-lg">Sertifikasi Saya</h2>
                        <button className="btn btn-sm" onClick={() => navigate("/employee/certification")}>
                            Lihat Semua
                        </button>
                    </div>

                    <div className="overflow-auto">
                        <table className="table table-xs md:table-sm">
                            <thead>
                                <tr>
                                    <th>Nama Sertifikat</th>
                                    <th>Tanggal Terbit</th>
                                    <th>Berlaku s/d</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={4}>
                                                <div className="skeleton h-5 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : myCerts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-sm opacity-60">
                                            Belum ada data
                                        </td>
                                    </tr>
                                ) : (
                                    myCerts.map((c, i) => (
                                        <tr key={i}>
                                            <td className="whitespace-nowrap">
                                                {c.certificateName || c.certificationName || c.code || "-"}
                                            </td>
                                            <td className="whitespace-nowrap">{fmtID(c.certDate || c.validFrom)}</td>
                                            <td className="whitespace-nowrap">{fmtID(c.validUntil)}</td>
                                            <td className="whitespace-nowrap">
                                                <StatusBadge value={c.status} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Kewajiban Saya */}
            <div className="card bg-base-100 border rounded-2xl shadow-sm">
                <div className="card-body p-4 md:p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="card-title text-base md:text-lg">Kewajiban Saya (Belum Diambil)</h2>
                    </div>

                    <div className="overflow-auto">
                        <table className="table table-xs md:table-sm">
                            <thead>
                                <tr>
                                    <th>Rule</th>
                                    <th>Nama Sertifikat</th>
                                    <th>Level</th>
                                    <th>Sub Bidang</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={4}>
                                                <div className="skeleton h-5 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : myMusts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-sm opacity-60">
                                            Tidak ada kewajiban yang belum diambil.
                                        </td>
                                    </tr>
                                ) : (
                                    myMusts.map((e, i) => (
                                        <tr key={i}>
                                            <td className="whitespace-nowrap">
                                                {e.ruleCode ||
                                                    [
                                                        e.certificationCode,
                                                        e.certificationLevel?.level ?? e.level,
                                                        e.subFieldCode,
                                                    ]
                                                        .filter(Boolean)
                                                        .join("-")}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                {e.certificationName || e.certificationCode || "-"}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                {e.certificationLevel?.level ?? e.level ?? "-"}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                {e.subFieldName || e.subFieldCode || "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Jadwal Saya */}
            <div className="card bg-base-100 border rounded-2xl shadow-sm">
                <div className="card-body p-4 md:p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="card-title text-base md:text-lg">Jadwal Saya</h2>
                    </div>

                    <div className="overflow-auto">
                        <table className="table table-xs md:table-sm">
                            <thead>
                                <tr>
                                    <th>Batch</th>
                                    <th>Rule</th>
                                    <th>Periode</th>
                                    <th>Status Batch</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={4}>
                                                <div className="skeleton h-5 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : mySchedule.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-sm opacity-60">
                                            Belum ada jadwal.
                                        </td>
                                    </tr>
                                ) : (
                                    mySchedule.map((s, i) => (
                                        <tr key={i}>
                                            <td className="whitespace-nowrap">{s.batchName || s.name}</td>
                                            <td className="whitespace-nowrap">
                                                {s.ruleCode ||
                                                    [
                                                        s.certificationCode,
                                                        s.certificationLevel?.level ?? s.level,
                                                        s.subFieldCode,
                                                    ]
                                                        .filter(Boolean)
                                                        .join("-")}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                {fmtID(s.startDate)} – {fmtID(s.endDate)}
                                            </td>
                                            <td className="whitespace-nowrap">{s.status || s.batchStatus}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
