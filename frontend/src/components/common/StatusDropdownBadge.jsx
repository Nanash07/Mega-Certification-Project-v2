// src/components/common/StatusDropdownBadge.jsx
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Status badge dengan dropdown menu untuk mengubah status
 *
 * @example
 * const STATUS_OPTIONS = [
 *   { value: true, label: "Active", badgeClass: "badge-success", btnClass: "btn-success" },
 *   { value: false, label: "Nonactive", badgeClass: "badge-secondary", btnClass: "btn-secondary" },
 * ];
 *
 * <StatusDropdownBadge
 *   currentValue={row.isActive}
 *   options={STATUS_OPTIONS}
 *   onChange={(newValue) => handleChangeStatus(row, newValue)}
 *   disabled={!canEdit}
 * />
 */
export default function StatusDropdownBadge({
    currentValue,
    options = [],
    onChange,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const btnRef = useRef(null);

    const currentOption = options.find((o) => o.value === currentValue) || options[0];

    useEffect(() => {
        function handleClickOutside(e) {
            if (btnRef.current && !btnRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const handleClick = (e) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY + 4,
        });
        setOpen((v) => !v);
    };

    const handleSelect = async (option) => {
        if (option.value === currentValue) {
            setOpen(false);
            return;
        }
        setOpen(false);
        if (onChange) {
            await onChange(option.value);
        }
    };

    if (!currentOption) return null;

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                disabled={disabled}
                className={`badge badge-sm whitespace-nowrap flex items-center gap-1 ${currentOption.badgeClass || ""} text-white ${
                    disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                }`}
                onClick={handleClick}
            >
                <span>{currentOption.label}</span>
                {!disabled && <ChevronDown className="w-3 h-3" />}
            </button>

            {open && (
                <div className="fixed inset-0 z-[999]" onClick={() => setOpen(false)}>
                    <div
                        className="absolute"
                        style={{ top: menuPos.y, left: menuPos.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-base-100 shadow-xl rounded-xl border border-gray-200 p-2 text-xs flex flex-col gap-1.5">
                            {options.map((option) => (
                                <button
                                    key={String(option.value)}
                                    type="button"
                                    className={`btn btn-xs ${option.btnClass || "btn-ghost"} text-white rounded-lg w-full justify-center`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
