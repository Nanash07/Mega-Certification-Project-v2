import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { fetchAllTemplates, updateTemplate } from "../../services/notificationTemplateService";
import { fetchAllSchedules, updateSchedule, runScheduleNow } from "../../services/notificationScheduleService";

export default function NotificationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState(false);
    const textareaRef = useRef(null);

    const TAB_LABELS = {
        BATCH_NOTIFICATION: "Batch Reminder",
        CERT_REMINDER: "Due Reminder",
        EXPIRED_NOTICE: "Expired Reminder",
    };

    const getTabLabel = (code) => TAB_LABELS[code] || code.replaceAll("_", " ");

    const VARIABLE_GUIDE = {
        sapaan: "Bapak/Ibu sesuai gender",
        nama: "Nama karyawan",
        namaSertifikasi: "Nama sertifikasi.",
        berlakuSampai: "Tanggal akhir masa berlaku",
        namaBatch: "Kode/nama batch pelaksanaan.",
        mulaiTanggal: "Tanggal pelaksanaan batch",
    };

    const extractUsedVariables = (text = "") => {
        const keys = Object.keys(VARIABLE_GUIDE);
        return keys.filter((k) => text.includes(`{{${k}}}`));
    };

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

    const handleRunNow = async (type) => {
        try {
            await runScheduleNow(type);
            toast.success("Notifikasi dijalankan manual");
        } catch {
            toast.error("Gagal menjalankan notifikasi");
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
                <span className="loading loading-dots loading-lg" />
            </div>
        );
    }

    if (!activeTab || templates.length === 0) {
        return <div className="text-center p-10">Tidak ada template notifikasi yang ditemukan.</div>;
    }

    const tpl = templates.find((t) => t.code === activeTab);
    const schedule = getScheduleByType(activeTab);

    if (!tpl) return null;

    const currentTitle = editing[tpl.id]?.title ?? tpl.title;
    const currentBody = editing[tpl.id]?.body ?? tpl.body;
    const previewData = renderPreview(currentTitle, currentBody);

    const allKeys = Object.keys(VARIABLE_GUIDE);

    return (
        <div className="space-y-6 w-full">
            <div className="tabs tabs-lift w-full mb-0">
                {templates.map((tabTpl) => (
                    <button
                        key={tabTpl.code}
                        className={`tab ${activeTab === tabTpl.code ? "tab-active" : ""}`}
                        onClick={() => setActiveTab(tabTpl.code)}
                    >
                        {getTabLabel(tabTpl.code)}
                    </button>
                ))}
            </div>

            <div className="card bg-base-100 shadow p-6 w-full border-t-0 rounded-t-none">
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <div>
                        <h3 className="font-semibold text-lg">{getTabLabel(tpl.code)}</h3>
                        <p className="text-xs text-gray-400">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5 items-stretch">
                    <div className="flex flex-col space-y-3 h-full">
                        <div>
                            <label className="text-gray-500 mb-1 block text-xs">Judul Notifikasi</label>
                            <input
                                type="text"
                                className="input input-bordered w-full text-xs"
                                value={currentTitle}
                                onChange={(e) => handleChangeTemplate(tpl.id, "title", e.target.value)}
                            />
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="text-gray-500 mb-1 block text-xs">Isi Pesan</label>
                            <textarea
                                ref={textareaRef}
                                key={tpl.id}
                                className="textarea textarea-bordered w-full text-xs resize-none overflow-hidden break-words"
                                style={{
                                    wordBreak: "break-word",
                                    whiteSpace: "pre-wrap",
                                    lineHeight: "1.6",
                                    minHeight: "80px",
                                }}
                                value={currentBody}
                                onChange={(e) => handleChangeTemplate(tpl.id, "body", e.target.value)}
                            />
                        </div>

                        <div className="mt-2">
                            <label className="text-gray-500 mb-3 block text-xs">Penjelasan variabel yang dipakai</label>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {allKeys.map((key) => (
                                    <div key={key} className="flex items-start gap-2">
                                        <code className="badge badge-xs badge-soft">{`{{${key}}}`}</code>
                                        <span className="text-gray-600">{VARIABLE_GUIDE[key]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col h-full">
                        <label className="text-gray-500 mb-1 block text-xs">Preview</label>
                        <div className="border border-gray-300 rounded-xl p-4 flex-1 text-xs leading-relaxed bg-gray-50 break-words">
                            <p className="font-semibold text-base text-black mb-2 break-words">
                                {previewData.hasilJudul}
                            </p>
                            <div
                                className="text-gray-700 break-words"
                                dangerouslySetInnerHTML={{ __html: previewData.hasilIsiHTML }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end py-3">
                    <button
                        className="btn btn-primary btn-sm flex items-center gap-2"
                        onClick={() => handleSaveTemplate(tpl.id)}
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? "Menyimpan..." : "Simpan Template"}
                    </button>
                </div>

                <div className="border-t pt-5">
                    <h4 className="font-semibold text-xs mb-3 text-gray-600">Jadwal Notifikasi Otomatis</h4>

                    <div className="w-full md:w-1/2 space-y-4">
                        <div>
                            <label className="text-gray-500 text-xs mb-1 block">Jam</label>
                            <input
                                type="time"
                                className="input input-bordered w-full"
                                value={schedule.time || ""}
                                onChange={(e) => handleChangeSchedule(tpl.code, "time", e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                className="toggle toggle-success"
                                checked={schedule.active || false}
                                onChange={(e) => handleChangeSchedule(tpl.code, "active", e.target.checked)}
                            />
                            <div>
                                <p className="font-medium text-xs text-gray-700">Aktif</p>
                                <p className="text-xs text-gray-400">
                                    Aktifkan agar notifikasi ini berjalan otomatis sesuai jadwal
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                className="toggle toggle-warning"
                                checked={schedule.skipWeekend || false}
                                onChange={(e) => handleChangeSchedule(tpl.code, "skipWeekend", e.target.checked)}
                            />
                            <div>
                                <p className="font-medium text-xs text-gray-700">Skip Weekend</p>
                                <p className="text-xs text-gray-400">
                                    Lewati pengiriman notifikasi di hari Sabtu & Minggu
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                className="btn btn-primary btn-sm flex items-center gap-2"
                                onClick={() => handleSaveSchedule(schedule)}
                                disabled={saving}
                            >
                                <Save size={16} />
                                {saving ? "Menyimpan..." : "Simpan Jadwal"}
                            </button>

                            {/* <button className="btn btn-ghost btn-sm" onClick={() => handleRunNow(tpl.code)}>Run Now</button> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
