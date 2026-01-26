import { Check, X } from "lucide-react";
import { getPasswordValidationStatus } from "../../utils/passwordUtils";


export default function PasswordRequirements({ password, show = true }) {
    if (!show) return null;

    const requirements = getPasswordValidationStatus(password);

    return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 font-medium text-[9px]">
            {requirements.map((req) => (
                <div key={req.id} className="flex items-center gap-1">
                    {req.passed ? (
                        <Check size={10} className="text-success shrink-0" />
                    ) : (
                        <div className="w-[10px] h-[10px] rounded-full border border-gray-300 flex items-center justify-center shrink-0">
                            <div className="w-[2px] h-[2px] bg-gray-300 rounded-full" />
                        </div>
                    ) }
                    <span className={req.passed ? "text-success" : "text-gray-400"}>
                        {req.label}
                    </span>
                </div>
            ))}
        </div>
    );
}
