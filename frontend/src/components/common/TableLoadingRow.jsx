export default function TableLoadingRow({ colSpan = 10 }) {
    return (
        <tr>
            <td colSpan={colSpan} className="text-center py-16">
                <span className="loading loading-dots loading-lg text-primary" />
            </td>
        </tr>
    );
}
