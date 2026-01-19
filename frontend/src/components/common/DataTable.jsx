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
