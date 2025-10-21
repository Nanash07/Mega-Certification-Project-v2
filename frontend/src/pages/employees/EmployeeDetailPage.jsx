import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

import { getEmployeeDetail } from "../../services/employeeService";
import { fetchCertifications } from "../../services/employeeCertificationService";
import { fetchEmployeeHistories } from "../../services/employeeHistoryService";
import { fetchEligibilityByEmployee } from "../../services/employeeEligibilityService";

import ViewEmployeeCertificationModal from "../../components/employee-certifications/ViewEmployeeCertificationModal";
import UploadCertificationModal from "../../components/employee-certifications/UploadEmployeeCertificationModal";
import EditCertificationModal from "../../components/employee-certifications/EditEmployeeCertificationModal";

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [employee, setEmployee] = useState(null);
    const [certifications, setCertifications] = useState([]);
    const [histories, setHistories] = useState([]);
    const [eligibilities, setEligibilities] = useState([]);

    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("certifications"); // certifications | history | eligibility

    const [viewData, setViewData] = useState(null);
    const [uploadData, setUploadData] = useState(null);
    const [editData, setEditData] = useState(null);

    // Load Data
    const loadData = async () => {
        try {
            setLoading(true);
            const [emp, certRes, histRes, eligRes] = await Promise.all([
                getEmployeeDetail(id),
                fetchCertifications({ employeeIds: [id], page: 0, size: 100 }),
                fetchEmployeeHistories({ employeeId: id, page: 0, size: 50 }),
                fetchEligibilityByEmployee(id),
            ]);
            setEmployee(emp);
            setCertifications(certRes.content || []);
            setHistories(histRes.content || []);
            setEligibilities(eligRes || []);
        } catch (err) {
            console.error("❌ loadData error:", err);
            toast.error("Gagal memuat detail pegawai");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const formatDate = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const translateGender = (gender) => {
        if (!gender) return "-";
        return gender === "F" ? "Perempuan" : gender === "M" ? "Laki-laki" : gender;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-dots loading-lg" />
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="text-center text-gray-500 p-10">
                ❌ Data pegawai tidak ditemukan
                <div className="mt-3">
                    <button className="btn btn-accent btn-sm" onClick={() => navigate(-1)}>
                        Kembali
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tombol Back */}
            <div>
                <button className="btn btn-sm btn-accent mb-2 flex items-center gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} />
                    Kembali
                </button>
            </div>

            {/* Informasi Pribadi */}
            <div className="card bg-base-100 shadow p-5">
                <h2 className="font-bold text-xl mb-4">Informasi Pribadi</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500">NIP</p>
                        <p className="font-medium">{employee.nip}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Nama</p>
                        <p className="font-medium">{employee.name}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium">{employee.email || "-"}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Jenis Kelamin</p>
                        <p className="font-medium">{translateGender(employee.gender)}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Status</p>
                        <span
                            className={`badge badge-sm text-white ${
                                employee.status === "ACTIVE"
                                    ? "badge-success"
                                    : employee.status === "RESIGN"
                                    ? "badge-neutral"
                                    : "badge-error"
                            }`}
                        >
                            {employee.status || "-"}
                        </span>
                    </div>
                    <div>
                        <p className="text-gray-500">Tanggal SK</p>
                        <p className="font-medium">{formatDate(employee.effectiveDate)}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs tabs-border w-fit">
                <a
                    className={`tab ${tab === "certifications" ? "tab-active" : ""}`}
                    onClick={() => setTab("certifications")}
                >
                    Sertifikasi
                </a>
                <a className={`tab ${tab === "history" ? "tab-active" : ""}`} onClick={() => setTab("history")}>
                    Riwayat Jabatan
                </a>
                <a className={`tab ${tab === "eligibility" ? "tab-active" : ""}`} onClick={() => setTab("eligibility")}>
                    Eligibility
                </a>
            </div>

            {/* ===== TAB: CERTIFICATIONS ===== */}
            {tab === "certifications" && (
                <div className="card bg-base-100 shadow p-5">
                    <h2 className="font-bold text-lg mb-4">Sertifikasi</h2>
                    {certifications.length === 0 ? (
                        <p className="text-gray-400 text-sm">Belum ada sertifikasi</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {certifications.map((c) => (
                                <div key={c.id} className="card bg-slate-50 shadow">
                                    {c.fileUrl && (
                                        <figure className="h-40 bg-base-300 flex items-center justify-center">
                                            <img
                                                src={`/api/employee-certifications/${c.id}/file`}
                                                alt={c.certificationName}
                                                className="h-full w-full object-cover rounded"
                                            />
                                        </figure>
                                    )}
                                    <div className="card-body p-4">
                                        <h3 className="font-semibold text-base">{c.certificationName}</h3>
                                        <p className="text-xs text-gray-500">{c.certificationCode}</p>
                                        <p className="text-xs text-gray-400 italic">
                                            Jabatan saat menerima: {c.jobPositionTitle || "-"}
                                        </p>

                                        <div className="mt-2 text-sm space-y-1">
                                            <p>
                                                <strong>No:</strong> {c.certNumber || "-"}
                                            </p>
                                            <p>
                                                <strong>Tanggal:</strong> {formatDate(c.certDate)}
                                            </p>
                                            <p>
                                                <strong>Exp:</strong> {formatDate(c.validUntil)}
                                            </p>
                                            <p>
                                                <strong>Lembaga:</strong> {c.institutionName || "-"}
                                            </p>
                                            <p>
                                                <strong>Status:</strong>{" "}
                                                <span
                                                    className={`badge badge-sm text-white ${
                                                        c.status === "ACTIVE"
                                                            ? "badge-success"
                                                            : c.status === "EXPIRED"
                                                            ? "badge-error"
                                                            : c.status === "DUE"
                                                            ? "badge-warning"
                                                            : c.status === "PENDING"
                                                            ? "badge-info"
                                                            : c.status === "INVALID"
                                                            ? "badge-secondary"
                                                            : "badge-ghost"
                                                    }`}
                                                >
                                                    {c.status}
                                                </span>
                                            </p>
                                        </div>

                                        <div className="mt-3 flex flex-col gap-2">
                                            {c.fileUrl ? (
                                                <button
                                                    className="btn btn-sm btn-primary w-full"
                                                    onClick={() => setViewData(c)}
                                                >
                                                    Lihat
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-sm btn-info w-full"
                                                    onClick={() => setUploadData(c)}
                                                >
                                                    Upload
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-sm btn-secondary w-full"
                                                onClick={() => setEditData(c)}
                                            >
                                                Edit Detail
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB: HISTORY ===== */}
            {tab === "history" && (
                <div className="card bg-base-100 shadow p-5">
                    <h2 className="font-bold text-lg mb-4">Riwayat Jabatan</h2>
                    {histories.length === 0 ? (
                        <p className="text-gray-400 text-sm">Belum ada riwayat jabatan</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra text-xs">
                                <thead className="bg-base-200">
                                    <tr>
                                        <th>No</th>
                                        <th>Aksi</th>
                                        <th>Jabatan Lama</th>
                                        <th>Jabatan Baru</th>
                                        <th>Unit</th>
                                        <th>Divisi</th>
                                        <th>Regional</th>
                                        <th>Tanggal Efektif</th>
                                        <th>Tanggal Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {histories.map((h, i) => (
                                        <tr key={h.id}>
                                            <td>{i + 1}</td>
                                            <td>
                                                <span
                                                    className={`badge badge-sm text-white ${
                                                        h.actionType === "CREATED"
                                                            ? "badge-success"
                                                            : h.actionType === "UPDATED"
                                                            ? "badge-info"
                                                            : h.actionType === "MUTASI"
                                                            ? "badge-warning"
                                                            : h.actionType === "RESIGN"
                                                            ? "badge-neutral"
                                                            : "badge-error"
                                                    }`}
                                                >
                                                    {h.actionType}
                                                </span>
                                            </td>
                                            <td>{h.oldJobTitle || "-"}</td>
                                            <td>{h.newJobTitle || "-"}</td>
                                            <td>{h.newUnitName || "-"}</td>
                                            <td>{h.newDivisionName || "-"}</td>
                                            <td>{h.newRegionalName || "-"}</td>
                                            <td>{formatDate(h.effectiveDate)}</td>
                                            <td>{formatDate(h.actionAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB: ELIGIBILITY ===== */}
            {tab === "eligibility" && (
                <div className="card bg-base-100 shadow p-5">
                    <h2 className="font-bold text-lg mb-4">Eligibility Sertifikasi</h2>
                    {eligibilities.length === 0 ? (
                        <p className="text-gray-400 text-sm">Belum ada data eligibility</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra text-xs">
                                <thead className="bg-base-200">
                                    <tr>
                                        <th>No</th>
                                        <th>Kode Sertifikasi</th>
                                        <th>Nama Sertifikasi</th>
                                        <th>Level</th>
                                        <th>Sub Bidang</th>
                                        <th>Status</th>
                                        <th>Sisa Waktu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eligibilities.map((e, i) => (
                                        <tr key={e.id || i}>
                                            <td>{i + 1}</td>
                                            <td>{e.certificationCode || "-"}</td>
                                            <td>{e.certificationName || "-"}</td>
                                            <td>{e.certificationLevelLevel || "-"}</td>
                                            <td>{e.subFieldCode || "-"}</td>
                                            <td>
                                                <span
                                                    className={`badge badge-sm text-white ${
                                                        e.status === "ACTIVE"
                                                            ? "badge-success"
                                                            : e.status === "EXPIRED"
                                                            ? "badge-error"
                                                            : e.status === "DUE"
                                                            ? "badge-warning"
                                                            : "badge-info"
                                                    }`}
                                                >
                                                    {e.status || "-"}
                                                </span>
                                            </td>
                                            <td>{e.sisaWaktu || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ===== MODALS ===== */}
            {viewData && (
                <ViewEmployeeCertificationModal
                    open={!!viewData}
                    certId={viewData.id}
                    onClose={() => setViewData(null)}
                    onUpdated={loadData}
                />
            )}
            {uploadData && (
                <UploadCertificationModal
                    open={!!uploadData}
                    certId={uploadData.id}
                    onClose={() => setUploadData(null)}
                    onUploaded={loadData}
                />
            )}
            {editData && (
                <EditCertificationModal
                    open={!!editData}
                    data={editData}
                    onClose={() => setEditData(null)}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
