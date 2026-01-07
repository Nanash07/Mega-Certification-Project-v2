// =============================================================================
// Reusable Confirm Dialog Component
// =============================================================================

/**
 * ConfirmDialog - Modal dialog for confirming destructive actions
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {Function} props.onConfirm - Callback when confirmed
 * @param {Function} props.onCancel - Callback when cancelled
 * @param {string} [props.confirmLabel="Hapus"] - Confirm button label
 * @param {string} [props.cancelLabel="Batal"] - Cancel button label
 * @param {string} [props.confirmClass="btn-error"] - Confirm button class
 */
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
