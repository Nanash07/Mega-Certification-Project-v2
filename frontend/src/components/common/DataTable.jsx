// =============================================================================
// Reusable Data Table Component
// =============================================================================

/**
 * DataTable - Table with loading and empty states
 *
 * @param {Object} props
 * @param {string[]} props.columns - Column headers
 * @param {Array} props.data - Data rows
 * @param {boolean} props.loading - Loading state
 * @param {string} [props.emptyMessage="Tidak ada data"] - Empty state message
 * @param {number} [props.startIdx=1] - Starting index for row numbers
 * @param {Function} props.renderRow - Function to render each row (row, index) => JSX
 */
export default function DataTable({
    columns,
    data,
    loading,
    emptyMessage = "Tidak ada data",
    startIdx = 1,
    renderRow,
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow bg-base-100">
            <table className="table table-zebra">
                <thead className="bg-base-200 text-xs">
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="text-xs">
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-10">
                                <span className="loading loading-dots loading-md" />
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center text-gray-400 py-10">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => renderRow(row, startIdx + idx))
                    )}
                </tbody>
            </table>
        </div>
    );
}
