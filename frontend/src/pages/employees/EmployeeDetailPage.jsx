// src/pages/employees/EmployeeDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, User, Briefcase, Award, History, CheckCircle, FileImage } from "lucide-react";

import { getEmployeeDetail } from "../../services/employeeService";
import { fetchCertifications } from "../../services/employeeCertificationService";
import { fetchEmployeeHistories } from "../../services/employeeHistoryService";
import { fetchEligibilityByEmployee } from "../../services/employeeEligibilityService";

import ViewEmployeeCertificationModal from "../../components/employee-certifications/ViewEmployeeCertificationModal";
import UploadCertificationModal from "../../components/employee-certifications/UploadEmployeeCertificationModal";
import EditCertificationModal from "../../components/employee-certifications/EditEmployeeCertificationModal";

const TABS = [
    { id: "certifications", label: "Sertifikasi", icon: Award },
    { id: "history", label: "Riwayat Jabatan", icon: History },
    { id: "eligibility", label: "Eligibility", icon: CheckCircle },
];

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [employee, setEmployee] = useState(null);
    const [certifications, setCertifications] = useState([]);
    const [histories, setHistories] = useState([]);
    const [eligibilities, setEligibilities] = useState([]);

    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("certifications");

    const [viewData, setViewData] = useState(null);
    const [uploadData, setUploadData] = useState(null);
    const [editData, setEditData] = useState(null);

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
            console.error("loadData error:", err);
            toast.error("Gagal memuat detail pegawai");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <div className="flex justify-center py-16">
                <span className="loading loading-dots loading-lg text-primary" />
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <User size={48} className="mb-3 opacity-30" />
                <p className="text-sm">Data pegawai tidak ditemukan</p>
                <button className="btn btn-sm btn-accent mt-4" onClick={() => navigate(-1)}>
                    Kembali
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button className="btn btn-sm btn-ghost btn-circle" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold">{employee.name}</h1>
                        <p className="text-xs text-gray-500">NIP: {employee.nip}</p>
                    </div>
                </div>
                <span
                    className={`badge text-white ${
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

            {/* Informasi Pribadi Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <User size={16} className="text-gray-500" />
                    <h2 className="font-semibold text-sm">Informasi Pribadi</h2>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                        <div>
                            <p className="text-gray-400 text-xs mb-1">NIP</p>
                            <p className="font-medium">{employee.nip}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Nama</p>
                            <p className="font-medium">{employee.name}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Email</p>
                            <p className="font-medium">{employee.email || "-"}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Jenis Kelamin</p>
                            <p className="font-medium">{translateGender(employee.gender)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Status</p>
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
                    </div>
                </div>
            </div>

            {/* Informasi Jabatan Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Briefcase size={16} className="text-gray-500" />
                    <h2 className="font-semibold text-sm">Posisi & Jabatan</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {/* Jabatan Utama */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="badge badge-sm badge-primary text-white">UTAMA</span>
                            <span className="font-semibold">{employee.jobName || "-"}</span>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div className="bg-base-200/50 rounded-lg p-3">
                                <p className="text-gray-400 text-xs mb-1">Unit</p>
                                <p className="font-medium">{employee.unitName || "-"}</p>
                            </div>
                            <div className="bg-base-200/50 rounded-lg p-3">
                                <p className="text-gray-400 text-xs mb-1">Divisi</p>
                                <p className="font-medium">{employee.divisionName || "-"}</p>
                            </div>
                            <div className="bg-base-200/50 rounded-lg p-3">
                                <p className="text-gray-400 text-xs mb-1">Regional</p>
                                <p className="font-medium">{employee.regionalName || "-"}</p>
                            </div>
                            <div className="bg-base-200/50 rounded-lg p-3">
                                <p className="text-gray-400 text-xs mb-1">Tanggal SK</p>
                                <p className="font-medium">{formatDate(employee.effectiveDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Jabatan Kedua (Optional) */}
                    {employee.jobPositionId2 && (
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="badge badge-sm badge-secondary text-white">KEDUA</span>
                                <span className="font-semibold">{employee.jobName2 || "-"}</span>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                <div className="bg-base-200/50 rounded-lg p-3">
                                    <p className="text-gray-400 text-xs mb-1">Unit</p>
                                    <p className="font-medium">{employee.unitName2 || "-"}</p>
                                </div>
                                <div className="bg-base-200/50 rounded-lg p-3">
                                    <p className="text-gray-400 text-xs mb-1">Divisi</p>
                                    <p className="font-medium">{employee.divisionName2 || "-"}</p>
                                </div>
                                <div className="bg-base-200/50 rounded-lg p-3">
                                    <p className="text-gray-400 text-xs mb-1">Regional</p>
                                    <p className="font-medium">{employee.regionalName2 || "-"}</p>
                                </div>
                                <div className="bg-base-200/50 rounded-lg p-3">
                                    <p className="text-gray-400 text-xs mb-1">Tanggal SK</p>
                                    <p className="font-medium">{formatDate(employee.effectiveDate2)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs - Pill Style */}
            <div className="flex flex-wrap gap-2">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    const count = t.id === "certifications" ? certifications.length 
                                : t.id === "history" ? histories.length 
                                : eligibilities.length;
                    return (
                        <button
                            key={t.id}
                            className={`btn btn-sm rounded-full transition-all gap-2 ${
                                tab === t.id
                                    ? "btn-primary shadow-md"
                                    : "btn-ghost border border-gray-200 hover:border-primary/50"
                            }`}
                            onClick={() => setTab(t.id)}
                        >
                            <Icon size={14} />
                            {t.label}
                            <span className={`badge badge-xs ${tab === t.id ? "badge-ghost" : "badge-primary"}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ===== TAB: CERTIFICATIONS ===== */}
            {tab === "certifications" && (
                <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                    {certifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Award size={48} className="mb-3 opacity-30" />
                            <p className="text-sm">Belum ada sertifikasi</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                            {certifications.map((c) => (
                                <div
                                    key={c.id}
                                    className="p-4 hover:bg-base-200/30 transition-colors border-2 border-gray-200 rounded-lg"
                                >
                                    <div className="flex gap-4">
                                        {/* Thumbnail */}
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-base-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {c.fileUrl ? (
                                                <img
                                                    src={`/api/employee-certifications/${c.id}/file`}
                                                    alt={c.certificationName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`flex-col items-center justify-center text-gray-400 ${c.fileUrl ? 'hidden' : 'flex'}`}>
                                                <FileImage size={24} className="opacity-50" />
                                                <span className="text-[10px] mt-1">No Image</span>
                                            </div>
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                                                        {c.certificationName}
                                                    </h3>
                                                    <p className="text-xs text-gray-500">{c.certificationCode}</p>
                                                </div>
                                                <span
                                                    className={`badge badge-sm text-white flex-shrink-0 ${
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
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                                                <span>No: <span className="text-gray-700 font-medium">{c.certNumber || "-"}</span></span>
                                                <span>Tanggal: <span className="text-gray-700 font-medium">{formatDate(c.certDate)}</span></span>
                                                <span>Exp: <span className="text-gray-700 font-medium">{formatDate(c.validUntil)}</span></span>
                                                <span>Lembaga: <span className="text-gray-700 font-medium">{c.institutionName || "-"}</span></span>
                                            </div>

                                            <div className="flex gap-2 mt-3">
                                                {c.fileUrl ? (
                                                    <button
                                                        className="btn btn-xs btn-primary rounded-full"
                                                        onClick={() => setViewData(c)}
                                                    >
                                                        Lihat
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-xs btn-info rounded-full"
                                                        onClick={() => setUploadData(c)}
                                                    >
                                                        Upload
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-xs btn-ghost border border-gray-200 rounded-full"
                                                    onClick={() => setEditData(c)}
                                                >
                                                    Edit
                                                </button>
                                            </div>
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
                <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                    {histories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <History size={48} className="mb-3 opacity-30" />
                            <p className="text-sm">Belum ada riwayat jabatan</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra text-xs w-full">
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
                                        <tr key={h.id} className="hover">
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
                                            <td className="font-medium">{h.newJobTitle || "-"}</td>
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
                <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                    {eligibilities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <CheckCircle size={48} className="mb-3 opacity-30" />
                            <p className="text-sm">Belum ada data eligibility</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra text-xs w-full">
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
                                        <tr key={e.id || i} className="hover">
                                            <td>{i + 1}</td>
                                            <td className="font-medium">{e.certificationCode || "-"}</td>
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

            {/* MODALS */}
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
