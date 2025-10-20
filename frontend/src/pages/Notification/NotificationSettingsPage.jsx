import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { Save, Play } from "lucide-react";
import { fetchAllTemplates, updateTemplate } from "../../services/notificationTemplateService";
import { fetchAllSchedules, updateSchedule, runScheduleNow } from "../../services/notificationScheduleService";

export default function NotificationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState(false);
    const textareasRef = useRef({});

    // Load data
    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            setLoading(true);
            const [tplData, schedData] = await Promise.all([fetchAllTemplates(), fetchAllSchedules()]);
            setTemplates(tplData);
            setSchedules(schedData);
            setTimeout(() => adjustAllTextareas(), 100);
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat data notifikasi");
        } finally {
            setLoading(false);
        }
    };

    // ===== Template Logic =====
    const adjustAllTextareas = () => {
        Object.values(textareasRef.current).forEach((ta) => {
            if (ta) {
                ta.style.height = "auto";
                ta.style.height = ta.scrollHeight + "px";
            }
        });
    };

    const handleChangeTemplate = (id, field, value) => {
        setEditing((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));

        const ta = textareasRef.current[id];
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = ta.scrollHeight + "px";
        }
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
            await loadAll();
            setEditing((prev) => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
        } catch (err) {
            console.error(err);
            toast.error("Gagal menyimpan perubahan");
        } finally {
            setSaving(false);
        }
    };

    // ===== Schedule Logic =====
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

    // ===== Preview Helper =====
    const renderPreview = (judul, isiPesan) => {
        const variabel = {
            sapaan: "Bapak",
            nama: "Purbaya Yudhi Sadewa",
            namaSertifikasi: "SMR Jenjang 7",
            berlakuSampai: "31 Desember 2025",
            namaBatch: "SMR-7-DES-2025",
            mulaiTanggal: "1 Desember 2025",
        };

        let hasilJudul = judul || "";
        let hasilIsi = isiPesan || "";

        for (const [key, val] of Object.entries(variabel)) {
            hasilJudul = hasilJudul.replaceAll(`{{${key}}}`, val);
            hasilIsi = hasilIsi.replaceAll(`{{${key}}}`, val);
        }

        return { hasilJudul, hasilIsi };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-dots loading-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {templates.map((tpl) => {
                const previewData = renderPreview(
                    editing[tpl.id]?.title || tpl.title,
                    editing[tpl.id]?.body || tpl.body
                );

                const schedule = getScheduleByType(tpl.code);

                return (
                    <div key={tpl.id} className="card bg-base-100 shadow p-5 space-y-5">
                        {/* Header Template */}
                        <div className="flex justify-between items-center flex-wrap gap-3">
                            <div>
                                <h3 className="font-semibold text-lg capitalize">{tpl.code.replaceAll("_", " ")}</h3>
                                <p className="text-xs text-gray-400">
                                    Terakhir diperbarui:{" "}
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

                        {/* Grid Editor + Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3 items-stretch">
                            {/* LEFT - Editor */}
                            <div className="flex flex-col space-y-3 h-full">
                                <div>
                                    <label className="text-gray-500 mb-1 block text-sm">Judul Notifikasi</label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full text-sm"
                                        defaultValue={tpl.title}
                                        onChange={(e) => handleChangeTemplate(tpl.id, "title", e.target.value)}
                                    />
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <label className="text-gray-500 mb-1 block text-sm">Isi Pesan</label>
                                    <textarea
                                        ref={(el) => (textareasRef.current[tpl.id] = el)}
                                        className="textarea textarea-bordered w-full text-sm resize-none overflow-hidden break-words"
                                        style={{
                                            wordBreak: "break-word",
                                            whiteSpace: "pre-wrap",
                                            lineHeight: "1.6",
                                            minHeight: "80px",
                                        }}
                                        defaultValue={tpl.body}
                                        onChange={(e) => handleChangeTemplate(tpl.id, "body", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* RIGHT - Preview */}
                            <div className="flex flex-col h-full">
                                <label className="text-gray-500 mb-1 block text-sm">Preview</label>
                                <div className="border border-gray-300 rounded-xl p-4 flex-1 text-sm leading-relaxed bg-gray-50 break-words">
                                    <p className="font-semibold text-base text-black mb-2 break-words">
                                        {previewData.hasilJudul}
                                    </p>
                                    <p className="text-gray-700 whitespace-pre-wrap break-words">
                                        {previewData.hasilIsi}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Tombol Simpan Template */}
                        <div className="flex justify-end">
                            <button
                                className="btn btn-primary btn-sm flex items-center gap-2"
                                onClick={() => handleSaveTemplate(tpl.id)}
                                disabled={saving}
                            >
                                <Save size={16} />
                                {saving ? "Menyimpan..." : "Simpan Template"}
                            </button>
                        </div>

                        {/* Jadwal Otomatis */}
                        <div className="border-t pt-4 mt-3">
                            <h4 className="font-semibold text-sm mb-3 text-gray-600">Jadwal Notifikasi Otomatis</h4>

                            {/* wrapper dibatasi setengah halaman */}
                            <div className="w-full md:w-1/2 space-y-4">
                                <div>
                                    <label className="text-gray-500 text-sm mb-1 block">Jam</label>
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
                                        <p className="font-medium text-sm text-gray-700">Aktif</p>
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
                                        onChange={(e) =>
                                            handleChangeSchedule(tpl.code, "skipWeekend", e.target.checked)
                                        }
                                    />
                                    <div>
                                        <p className="font-medium text-sm text-gray-700">Skip Weekend</p>
                                        <p className="text-xs text-gray-400">
                                            Lewati pengiriman notifikasi di hari Sabtu & Minggu
                                        </p>
                                    </div>
                                </div>

                                {/* Tombol Aksi */}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        className="btn btn-primary btn-sm flex items-center gap-2"
                                        onClick={() => handleSaveSchedule(schedule)}
                                    >
                                        <Save size={16} />
                                        Simpan Jadwal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
