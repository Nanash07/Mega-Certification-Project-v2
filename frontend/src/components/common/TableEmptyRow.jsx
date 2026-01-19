import { FileX } from "lucide-react";
export default function TableEmptyRow({ colSpan = 10, icon: Icon = FileX, message = "Tidak ada data" }) {
    return (
        <tr>
            <td colSpan={colSpan} className="text-center py-16">
                <div className="flex flex-col items-center text-gray-400">
                    <Icon size={48} className="mb-3 opacity-30" />
                    <p className="text-sm">{message}</p>
                </div>
            </td>
        </tr>
    );
}
