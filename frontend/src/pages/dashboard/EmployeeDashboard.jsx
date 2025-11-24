import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import api from "../../services/api";
import { formatShortIdDate } from "../../utils/date";

const fmtID = (d) => formatShortIdDate(d);

const STATUS_CLASS = {
    ACTIVE: "badge badge-success",
    DUE: "badge badge-warning",
    EXPIRED: "badge badge-error",
    PENDING: "badge badge-info",
    INVALID: "badge",
};

const CERT_STATUS_FILTERS = ["ALL", "ACTIVE", "DUE", "EXPIRED", "PENDING"];
const CERT_STATUS_LABEL = {
    ALL: "Semua",
    ACTIVE: "Aktif",
    DUE: "Due",
    EXPIRED: "Expired",
    PENDING: "Pending",
};

const DONUT_COLORS = ["#2563eb", "#f97316"];
const ONGOING_STATUS = new Set(["ONGOING", "RUNNING", "IN_PROGRESS", "ON_PROGRESS", "BERJALAN", "ACTIVE"]);
const COMPLETED_STATUS = new Set(["COMPLETED", "DONE", "FINISHED", "SELESAI", "PASSED"]);

function StatusBadge({ value }) {
    const cls = STATUS_CLASS[value] || "badge";
    const label = value ? value.replace(/_/g, " ") : "-";
    return <span className={cls}>{label}</span>;
}

function buildRule(row) {
    if (row?.ruleCode) return row.ruleCode;
    const parts = [
        row?.certificationCode || row?.code,
        row?.certificationLevel?.level ?? row?.level,
        row?.subFieldCode,
    ].filter(Boolean);
    return parts.length ? parts.join("-") : "-";
}

function getCertStatus(cert) {
    return (cert?.status || cert?.employeeCertificationStatus || cert?.certificateStatus || "").toUpperCase();
}

function normalizeBatchStatus(batch) {
    const status = (batch?.batchStatus || batch?.status || "").toUpperCase();
    if (ONGOING_STATUS.has(status)) {
        return { code: "ONGOING", label: "Berjalan" };
    }
    if (COMPLETED_STATUS.has(status)) {
        return { code: "COMPLETED", label: "Selesai" };
    }
    if (status === "UPCOMING" || status === "PLANNED" || status === "SCHEDULED") {
        return { code: "UPCOMING", label: "Terjadwal" };
    }
    return { code: status || "UNKNOWN", label: status || "UNKNOWN" };
}

export default function EmployeeDashboard() {
    const navigate = useNavigate();

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);

    const [myCerts, setMyCerts] = useState([]);
    const [myMusts, setMyMusts] = useState([]);
    const [mySchedule, setMySchedule] = useState([]);
    const [certStatusFilter, setCertStatusFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);

    async function loadAll() {
        setLoading(true);
        try {
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

    const certStats = useMemo(() => {
        const base = { ACTIVE: 0, DUE: 0, EXPIRED: 0, PENDING: 0, OTHER: 0 };
        myCerts.forEach((cert) => {
            const status = getCertStatus(cert);
            if (status && base[status] !== undefined) {
                base[status] += 1;
            } else if (status) {
                base.OTHER += 1;
            }
        });
        return { ...base, TOTAL: myCerts.length, NON_ACTIVE: Math.max(myCerts.length - base.ACTIVE, 0) };
    }, [myCerts]);

    const { ongoingBatches, completedBatches } = useMemo(() => {
        const groups = { ongoing: [], completed: [] };
        mySchedule.forEach((batch) => {
            const normalized = normalizeBatchStatus(batch);
            if (normalized.code === "COMPLETED") {
                groups.completed.push({ ...batch, normalizedStatus: normalized.label });
            } else if (normalized.code === "ONGOING") {
                groups.ongoing.push({ ...batch, normalizedStatus: normalized.label });
            }
        });
        return { ongoingBatches: groups.ongoing, completedBatches: groups.completed };
    }, [mySchedule]);

    const donutData = useMemo(() => {
        if (certStats.TOTAL === 0) {
            return [
                { name: "Tersertifikasi", value: 0 },
                { name: "Butuh Aksi", value: 0 },
            ];
        }
        return [
            { name: "Tersertifikasi", value: certStats.ACTIVE },
            { name: "Butuh Aksi", value: certStats.NON_ACTIVE },
        ];
    }, [certStats]);

    const summaryCards = useMemo(
        () => [
            { key: "active", label: "Sertifikat Aktif", value: certStats.ACTIVE },
            { key: "due", label: "Perlu Aksi (Due)", value: certStats.DUE },
            { key: "expired", label: "Expired", value: certStats.EXPIRED },
            { key: "pending", label: "Menunggu Validasi", value: certStats.PENDING + certStats.OTHER },
            { key: "must", label: "Kewajiban Sertifikasi", value: myMusts.length },
            { key: "ongoing", label: "Batch Berjalan", value: ongoingBatches.length },
        ],
        [certStats, myMusts.length, ongoingBatches.length]
    );

    const filteredCerts = useMemo(() => {
        if (certStatusFilter === "ALL") return myCerts;
        return myCerts.filter((cert) => getCertStatus(cert) === certStatusFilter);
    }, [certStatusFilter, myCerts]);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Dashboard Pegawai</h1>
                <p className="text-sm opacity-70">
                    Halo{user?.name ? `, ${user.name}` : ""} • Ringkasan progres sertifikasi kamu
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="card bg-base-100 border rounded-2xl shadow-sm">
                              <div className="card-body p-4 gap-3">
                                  <div className="skeleton h-3 w-24" />
                                  <div className="skeleton h-6 w-16" />
                              </div>
                          </div>
                      ))
                    : summaryCards.map((card) => (
                          <div key={card.key} className="card bg-base-100 border rounded-2xl shadow-sm">
                              <div className="card-body p-4 gap-2">
                                  <p className="text-xs opacity-70">{card.label}</p>
                                  <p className="text-2xl font-bold">{card.value}</p>
                              </div>
                          </div>
                      ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg">Realisasi Sertifikasi</h2>
                            <div className="text-xs opacity-70">
                                Total: <span className="font-semibold">{certStats.TOTAL}</span>
                            </div>
                        </div>
                        <div className="h-56">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <span className="loading loading-ring loading-lg" />
                                </div>
                            ) : (
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
                                        >
                                            {donutData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${entry.name}`}
                                                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        {!loading && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: DONUT_COLORS[0] }}
                                    />
                                    Tersertifikasi • {certStats.ACTIVE}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: DONUT_COLORS[1] }}
                                    />
                                    Butuh Aksi • {certStats.NON_ACTIVE}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg">Batch Berjalan</h2>
                            {!loading && <span className="badge badge-outline">{ongoingBatches.length} batch</span>}
                        </div>
                        {loading ? (
                            <div className="space-y-3 mt-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="skeleton h-16 w-full" />
                                ))}
                            </div>
                        ) : ongoingBatches.length === 0 ? (
                            <p className="text-sm opacity-60 mt-4">Tidak ada batch yang sedang berjalan.</p>
                        ) : (
                            <div className="space-y-3 mt-4">
                                {ongoingBatches.map((batch, idx) => (
                                    <div
                                        key={`${batch.id || batch.batchId || idx}-ongoing`}
                                        className="rounded-xl border p-3 flex flex-col gap-1"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold text-sm">
                                                {batch.batchName || batch.name || `Batch #${idx + 1}`}
                                            </p>
                                            <span className="badge badge-outline">{batch.normalizedStatus}</span>
                                        </div>
                                        <p className="text-xs opacity-70">{buildRule(batch)}</p>
                                        <p className="text-xs">
                                            {fmtID(batch.startDate)} – {fmtID(batch.endDate)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg">List Kewajiban Sertifikasi</h2>
                        </div>
                        <div className="overflow-auto mt-4">
                            <table className="table table-xs md:table-sm">
                                <thead>
                                    <tr>
                                        <th>Rule</th>
                                        <th>Sertifikasi</th>
                                        <th>Jenjang</th>
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
                                        myMusts.map((must, idx) => (
                                            <tr key={`${must.id || idx}-must`}>
                                                <td className="whitespace-nowrap">{buildRule(must)}</td>
                                                <td className="whitespace-nowrap">
                                                    {must.certificationName || must.certificationCode || "-"}
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    {must.certificationLevel?.level ?? must.level ?? "-"}
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    {must.subFieldName || must.subFieldCode || "-"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 border rounded-2xl shadow-sm">
                    <div className="card-body p-4 md:p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title text-base md:text-lg">Batch Selesai</h2>
                        </div>
                        <div className="overflow-auto mt-4">
                            <table className="table table-xs md:table-sm">
                                <thead>
                                    <tr>
                                        <th>Batch</th>
                                        <th>Rule</th>
                                        <th>Periode</th>
                                        <th>Status</th>
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
                                    ) : completedBatches.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-sm opacity-60">
                                                Belum ada batch yang selesai.
                                            </td>
                                        </tr>
                                    ) : (
                                        completedBatches.map((batch, idx) => (
                                            <tr key={`${batch.id || batch.batchId || idx}-completed`}>
                                                <td className="whitespace-nowrap">
                                                    {batch.batchName || batch.name || "-"}
                                                </td>
                                                <td className="whitespace-nowrap">{buildRule(batch)}</td>
                                                <td className="whitespace-nowrap">
                                                    {fmtID(batch.startDate)} – {fmtID(batch.endDate)}
                                                </td>
                                                <td className="whitespace-nowrap">{batch.normalizedStatus}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 border rounded-2xl shadow-sm">
                <div className="card-body p-4 md:p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h2 className="card-title text-base md:text-lg">Sertifikat Dimiliki</h2>
                            <p className="text-sm opacity-70">Filter berdasarkan status sertifikat kamu</p>
                        </div>
                        <button className="btn btn-sm" onClick={() => navigate("/employee/certification")}>
                            Lihat Semua
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {CERT_STATUS_FILTERS.map((filter) => (
                            <button
                                key={filter}
                                className={`btn btn-xs md:btn-sm ${
                                    certStatusFilter === filter ? "btn-primary" : "btn-ghost border"
                                }`}
                                onClick={() => setCertStatusFilter(filter)}
                            >
                                {CERT_STATUS_LABEL[filter]}
                                {filter !== "ALL" && (
                                    <span className="badge badge-xs border-0 bg-base-100/40 ml-1">
                                        {certStats[filter] ?? 0}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="skeleton h-32 w-full rounded-2xl" />
                            ))}
                        </div>
                    ) : filteredCerts.length === 0 ? (
                        <p className="text-sm opacity-60">Tidak ada sertifikat pada filter ini.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredCerts.map((cert, idx) => {
                                const status = getCertStatus(cert);
                                return (
                                    <div key={`${cert.id || idx}-cert`} className="rounded-2xl border p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-sm">
                                                    {cert.certificateName || cert.certificationName || cert.code || "-"}
                                                </p>
                                                <p className="text-xs opacity-70">{buildRule(cert)}</p>
                                            </div>
                                            <StatusBadge value={status} />
                                        </div>
                                        <div className="text-xs">
                                            <p>Terbit: {fmtID(cert.certDate || cert.validFrom)}</p>
                                            <p>Berlaku s/d: {fmtID(cert.validUntil)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
