import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { Save, FileText, Clock, Bell, Calendar, CheckCircle, XCircle, Variable } from "lucide-react";
import { fetchAllTemplates, updateTemplate } from "../../services/notificationTemplateService";
import { fetchAllSchedules, updateSchedule } from "../../services/notificationScheduleService";

const TAB_CONFIG = {
    BATCH_NOTIFICATION: { label: "Batch Reminder", color: "info", icon: Calendar },
    CERT_REMINDER: { label: "Due Reminder", color: "warning", icon: Clock },
    EXPIRED_NOTICE: { label: "Expired Reminder", color: "error", icon: XCircle },
};

const VARIABLE_GUIDE = {
    sapaan: "Bapak/Ibu sesuai gender",
    nama: "Nama pegawai",
    namaSertifikasi: "Nama sertifikasi",
    berlakuSampai: "Tanggal akhir masa berlaku",
    namaBatch: "Kode/nama batch pelaksanaan",
    mulaiTanggal: "Tanggal pelaksanaan batch",
};

export default function NotificationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState(false);
    const textareaRef = useRef(null);

    const getTabConfig = (code) => TAB_CONFIG[code] || { label: code.replaceAll("_", " "), color: "neutral", icon: Bell };

    const adjustTextarea = () => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = ta.scrollHeight + "px";
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        if (!loading && activeTab) {
            setTimeout(adjustTextarea, 50);
        }
    }, [activeTab, loading]);

    const loadAll = async () => {
        try {
            setLoading(true);
            const [tplData, schedData] = await Promise.all([fetchAllTemplates(), fetchAllSchedules()]);
            setTemplates(tplData);
            setSchedules(schedData);

            if (tplData.length > 0) {
                setActiveTab((prev) => prev ?? tplData[0].code);
            }
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat data notifikasi");
        } finally {
            setLoading(false);
        }
    };

    const handleChangeTemplate = (id, field, value) => {
        setEditing((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
        adjustTextarea();
    };

    const handleSaveTemplate = async (id) => {
        try {
            setSaving(true);
            const editData = editing[id];
            if (!editData) {
                toast.error("Tidak ada perubahan");
                return;
            }

            await updateTemplate(id, {
                title: editData.title,
                body: editData.body,
                updatedBy: "admin",
            });

            toast.success("Template berhasil diperbarui");

            setEditing((prev) => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });

            await loadAll();
        } catch (err) {
            console.error(err);
            toast.error("Gagal menyimpan perubahan");
        } finally {
            setSaving(false);
        }
    };

    const getScheduleByType = (type) =>
        schedules.find((s) => s.type === type) || {
            time: "",
            active: false,
            skipWeekend: false,
        };

    const handleChangeSchedule = (type, field, value) => {
        setSchedules((prev) => prev.map((s) => (s.type === type ? { ...s, [field]: value } : s)));
    };

    const handleSaveSchedule = async (sch) => {
        try {
            setSaving(true);
            await updateSchedule({
                type: sch.type,
                time: sch.time,
                active: sch.active,
                skipWeekend: sch.skipWeekend,
                updatedBy: "admin",
            });
            toast.success("Jadwal berhasil diperbarui");
            await loadAll();
        } catch {
            toast.error("Gagal menyimpan jadwal");
        } finally {
            setSaving(false);
        }
    };

    const escapeHtml = (str = "") =>
        str
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const renderPreview = (judul, isiPesan) => {
        const variabel = {
            sapaan: "Bapak",
            nama: "Purbaya Yudhi Sadewa",
            namaSertifikasi: "SMR Jenjang 7",
            berlakuSampai: "31 Desember 2025",
            namaBatch: "SMR-7-DES-2025",
            mulaiTanggal: "1 Desember 2025",
            jenisBatch: "Sertifikasi",
        };

        let hasilJudul = judul || "";
        for (const [key, val] of Object.entries(variabel)) {
            hasilJudul = hasilJudul.replaceAll(`{{${key}}}`, val);
        }

        let html = escapeHtml(isiPesan || "");
        for (const [key, val] of Object.entries(variabel)) {
            const safeVal = `<b>${escapeHtml(String(val))}</b>`;
            html = html.replaceAll(`{{${key}}}`, safeVal);
        }
        html = html.replaceAll("\n", "<br/>");

        return { hasilJudul, hasilIsiHTML: html };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-dots loading-lg text-primary" />
            </div>
        );
    }

    if (!activeTab || templates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileText size={48} className="mb-3 opacity-30" />
                <p className="text-sm">Tidak ada template notifikasi ditemukan</p>
            </div>
        );
    }

    const tpl = templates.find((t) => t.code === activeTab);
    const schedule = getScheduleByType(activeTab);

    if (!tpl) return null;

    const currentTitle = editing[tpl.id]?.title ?? tpl.title;
    const currentBody = editing[tpl.id]?.body ?? tpl.body;
    const previewData = renderPreview(currentTitle, currentBody);
    const tabConfig = getTabConfig(activeTab);
    const TabIcon = tabConfig.icon;

    return (
        <div className="space-y-4 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold">Template & Jadwal</h1>
                    <p className="text-xs text-gray-500">{templates.length} template notifikasi</p>
                </div>
            </div>

            {/* Tabs - Pill Style */}
            <div className="flex flex-wrap gap-2">
                {templates.map((tabTpl) => {
                    const cfg = getTabConfig(tabTpl.code);
                    const Icon = cfg.icon;
                    return (
                        <button
                            key={tabTpl.code}
                            className={`btn btn-sm rounded-full transition-all ${
                                activeTab === tabTpl.code
                                    ? "btn-primary shadow-md"
                                    : "btn-ghost border border-gray-200 hover:border-primary/50"
                            }`}
                            onClick={() => setActiveTab(tabTpl.code)}
                        >
                            <Icon size={14} />
                            {cfg.label}
                        </button>
                    );
                })}
            </div>

            {/* Main Content Card */}
            <div className="card bg-base-100 shadow-sm border border-gray-100 overflow-hidden">
                {/* Card Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-${tabConfig.color}/10`}>
                            <TabIcon size={20} className={`text-${tabConfig.color}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-base sm:text-lg">{tabConfig.label}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Terakhir diperbarui{" "}
                                {new Date(tpl.updatedAt).toLocaleString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}{" "}
                                oleh {tpl.updatedBy || "–"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 space-y-5">
                    {/* Template Editor & Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Left: Editor */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block flex items-center gap-1">
                                    <Bell size={12} /> Judul Notifikasi
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full text-sm rounded-lg"
                                    value={currentTitle}
                                    onChange={(e) => handleChangeTemplate(tpl.id, "title", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block flex items-center gap-1">
                                    <FileText size={12} /> Isi Pesan
                                </label>
                                <textarea
                                    ref={textareaRef}
                                    key={tpl.id}
                                    className="textarea textarea-bordered w-full text-sm resize-none overflow-hidden rounded-lg"
                                    style={{
                                        wordBreak: "break-word",
                                        whiteSpace: "pre-wrap",
                                        lineHeight: "1.6",
                                        minHeight: "120px",
                                    }}
                                    value={currentBody}
                                    onChange={(e) => handleChangeTemplate(tpl.id, "body", e.target.value)}
                                />
                            </div>

                            {/* Variable Guide */}
                            <div className="border border-gray-200 rounded-xl p-3">
                                <label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1">
                                    <Variable size={12} /> Variabel yang Tersedia
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {Object.entries(VARIABLE_GUIDE).map(([key, desc]) => (
                                        <div key={key} className="flex items-start gap-2">
                                            <code className="badge badge-xs badge-neutral badge-outline font-mono">{`{{${key}}}`}</code>
                                            <span className="text-gray-600">{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Preview */}
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Preview</label>
                            <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 text-sm">
                                <p className="font-semibold text-base text-gray-900 mb-2">{previewData.hasilJudul}</p>
                                <div
                                    className="text-gray-700 leading-relaxed text-sm"
                                    dangerouslySetInnerHTML={{ __html: previewData.hasilIsiHTML }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Template Button */}
                    <div className="flex justify-end">
                        <button
                            className="btn btn-primary btn-sm rounded-lg flex items-center gap-2"
                            onClick={() => handleSaveTemplate(tpl.id)}
                            disabled={saving}
                        >
                            <Save size={14} />
                            {saving ? "Menyimpan..." : "Simpan Template"}
                        </button>
                    </div>
                </div>

                {/* Schedule Section */}
                <div className="border-t border-gray-100 p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-gray-500" />
                        <h4 className="font-semibold text-sm text-gray-700">Jadwal Notifikasi Otomatis</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        {/* Time */}
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Jam Pengiriman</label>
                            <input
                                type="time"
                                className="input input-bordered input-sm w-full rounded-lg"
                                value={schedule.time || ""}
                                onChange={(e) => handleChangeSchedule(tpl.code, "time", e.target.value)}
                            />
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-gray-100">
                            <input
                                type="checkbox"
                                className="toggle toggle-success toggle-sm"
                                checked={schedule.active || false}
                                onChange={(e) => handleChangeSchedule(tpl.code, "active", e.target.checked)}
                            />
                            <div>
                                <p className="font-medium text-xs text-gray-700 flex items-center gap-1">
                                    {schedule.active ? <CheckCircle size={12} className="text-success" /> : <XCircle size={12} className="text-gray-400" />}
                                    {schedule.active ? "Aktif" : "Nonaktif"}
                                </p>
                            </div>
                        </div>

                        {/* Skip Weekend Toggle */}
                        <div className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-gray-100">
                            <input
                                type="checkbox"
                                className="toggle toggle-warning toggle-sm"
                                checked={schedule.skipWeekend || false}
                                onChange={(e) => handleChangeSchedule(tpl.code, "skipWeekend", e.target.checked)}
                            />
                            <div>
                                <p className="font-medium text-xs text-gray-700">Skip Weekend</p>
                            </div>
                        </div>

                        {/* Save Schedule */}
                        <button
                            className="btn btn-accent btn-sm rounded-lg flex items-center gap-2"
                            onClick={() => handleSaveSchedule(schedule)}
                            disabled={saving}
                        >
                            <Save size={14} />
                            {saving ? "Menyimpan..." : "Simpan Jadwal"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
