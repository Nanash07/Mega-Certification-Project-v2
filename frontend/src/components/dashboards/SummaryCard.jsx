// src/pages/dashboards/SummaryCard.jsx
export default function SummaryCard({ label, value, tone = "neutral", icon = null }) {
    const tones = {
        neutral: "bg-base-100 text-base-content",
        success: "bg-green-50 text-green-700 border-green-100",
        warn: "bg-yellow-50 text-yellow-700 border-yellow-100",
        danger: "bg-red-50 text-red-700 border-red-100",
        info: "bg-blue-50 text-blue-700 border-blue-100",
    };

    return (
        <div className={`card border ${tones[tone] || tones.neutral} shadow-sm rounded-2xl`}>
            <div className="card-body p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-xs md:text-sm opacity-70">{label}</div>
                        <div className="text-2xl md:text-3xl font-extrabold leading-tight">
                            {new Intl.NumberFormat("id-ID").format(value ?? 0)}
                        </div>
                    </div>
                    {icon ? <div className="opacity-70">{icon}</div> : null}
                </div>
            </div>
        </div>
    );
}
