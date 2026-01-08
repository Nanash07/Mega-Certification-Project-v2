import React from "react";

export default function StatCard({ label, value, sub, onClick, tip, icon: Icon, color = "primary" }) {
    const colorClasses = {
        primary: "from-blue-500 to-blue-600",
        success: "from-green-500 to-green-600",
        warning: "from-amber-500 to-amber-600",
        error: "from-red-500 to-red-600",
        neutral: "from-gray-500 to-gray-600",
        info: "from-sky-500 to-sky-600",
    };

    return (
        <div className="tooltip tooltip-top w-full h-full" data-tip={tip || label} title={tip || label}>
            <button
                onClick={onClick}
                className="card bg-base-100 shadow-sm border border-gray-100 p-4 w-full h-full min-h-[100px] text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
            >
                <div className="flex items-start justify-between h-full">
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="text-xs text-gray-500 font-medium truncate">{label}</div>
                        <div className="text-2xl font-bold mt-1">{value ?? 0}</div>
                        <div className="text-xs text-gray-400 mt-auto">{sub || "\u00A0"}</div>
                    </div>
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-sm flex-shrink-0`}>
                        <Icon size={20} />
                    </div>
                </div>
            </button>
        </div>
    );
}
