import { Eraser } from "lucide-react";
export default function FilterCard({ children, onClear, cols = 6 }) {
    const gridColsClass = {
        2: "lg:grid-cols-2",
        3: "lg:grid-cols-3",
        4: "lg:grid-cols-4",
        5: "lg:grid-cols-5",
        6: "lg:grid-cols-6",
    }[cols] || "lg:grid-cols-6";

    return (
        <div className="card bg-base-100 shadow-sm border border-gray-100 p-4">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridColsClass} gap-3 text-xs`}>
                {children}
            </div>
            {onClear && (
                <div className="flex justify-end mt-3">
                    <button
                        type="button"
                        className="btn btn-sm btn-accent btn-soft rounded-lg flex gap-2"
                        onClick={onClear}
                    >
                        <Eraser size={14} />
                        Clear Filter
                    </button>
                </div>
            )}
        </div>
    );
}

export function FilterField({ label, icon: Icon, children }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="font-medium text-gray-600 flex items-center gap-1">
                {Icon && <Icon size={12} />}
                {label}
            </label>
            {children}
        </div>
    );
}
