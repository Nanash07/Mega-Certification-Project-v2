export default function ConfirmDialog({
    open,
    title = "Konfirmasi",
    message = "Apakah Anda yakin?",
    onConfirm,
    onCancel,
    confirmLabel = "Hapus",
    cancelLabel = "Batal",
    confirmClass = "btn-error",
}) {
    if (!open) return null;

    return (
        <dialog className="modal" open>
            <div className="modal-box">
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="py-2">{message}</p>
                <div className="modal-action">
                    <button className="btn" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button className={`btn ${confirmClass}`} onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onCancel}>close</button>
            </form>
        </dialog>
    );
}
