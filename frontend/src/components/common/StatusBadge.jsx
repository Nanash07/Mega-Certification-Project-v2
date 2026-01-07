// =============================================================================
// Reusable Status Badge Component
// =============================================================================

const STATUS_CLASSES = {
    // Certification statuses
    PENDING: "badge-info",
    ACTIVE: "badge-success",
    DUE: "badge-warning",
    EXPIRED: "badge-error",
    INVALID: "badge-secondary",
    NOT_YET_CERTIFIED: "badge-secondary",
    // Batch statuses
    PLANNED: "badge-neutral",
    ONGOING: "badge-info",
    FINISHED: "badge-success",
    CANCELLED: "badge-error",
    // Employee batch statuses
    SELECTED: "badge-info",
    PASSED: "badge-success",
    NOT_PASSED: "badge-error",
    ABSENT: "badge-warning",
};

const STATUS_LABELS = {
    PENDING: "Pending Upload",
    NOT_YET_CERTIFIED: "Belum Sertifikasi",
    PLANNED: "Direncanakan",
    ONGOING: "Berlangsung",
    FINISHED: "Selesai",
    CANCELLED: "Dibatalkan",
    SELECTED: "Terpilih",
    PASSED: "Lulus",
    NOT_PASSED: "Tidak Lulus",
    ABSENT: "Tidak Hadir",
};

/**
 * StatusBadge - Displays a colored badge based on status
 *
 * @param {Object} props
 * @param {string} props.status - Status value
 * @param {string} [props.tooltip] - Custom tooltip text
 * @param {string} [props.size="sm"] - Badge size (sm, md, lg)
 */
export default function StatusBadge({ status, tooltip, size = "sm" }) {
    if (!status) return <span>-</span>;

    const label =
        STATUS_LABELS[status] ||
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ");

    const className = STATUS_CLASSES[status] || "badge-secondary";

    return (
        <div className="tooltip" data-tip={tooltip || label}>
            <span className={`badge badge-${size} text-white whitespace-nowrap ${className}`}>{label}</span>
        </div>
    );
}

/**
 * SourceBadge - Displays eligibility source badge
 */
export function SourceBadge({ source }) {
    if (!source) return <span>-</span>;

    const label = source === "BY_JOB" ? "By Job" : source === "BY_NAME" ? "By Name" : source;
    const className = source === "BY_JOB" ? "badge-neutral" : "badge-info";

    return <span className={`badge badge-sm text-white whitespace-nowrap ${className}`}>{label}</span>;
}
