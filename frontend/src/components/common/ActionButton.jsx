import { Eye, Pencil, Trash2, Upload, Download, RotateCw, Plus, History } from "lucide-react";

const VARIANTS = {
    view: { Icon: Eye, cls: "btn-info", tip: "Lihat" },
    edit: { Icon: Pencil, cls: "btn-warning", tip: "Edit" },
    delete: { Icon: Trash2, cls: "btn-error", tip: "Hapus" },
    upload: { Icon: Upload, cls: "btn-success", tip: "Upload" },
    download: { Icon: Download, cls: "btn-neutral", tip: "Download" },
    refresh: { Icon: RotateCw, cls: "btn-primary", tip: "Refresh" },
    add: { Icon: Plus, cls: "btn-primary", tip: "Tambah" },
    history: { Icon: History, cls: "btn-accent", tip: "Histori" },
};

export default function ActionButton({ variant, onClick, tooltip, disabled = false, size = "xs" }) {
    const config = VARIANTS[variant];
    if (!config) return null;

    const { Icon, cls, tip } = config;
    const colorClass = cls.replace("btn-", "");

    return (
        <div className="tooltip" data-tip={tooltip || tip}>
            <button
                type="button"
                className={`btn btn-${size} ${cls} btn-soft border-${colorClass}`}
                onClick={onClick}
                disabled={disabled}
            >
                <Icon className="w-4 h-4" />
            </button>
        </div>
    );
}

export function ActionButtonGroup({ children }) {
    return <div className="flex gap-2">{children}</div>;
}
