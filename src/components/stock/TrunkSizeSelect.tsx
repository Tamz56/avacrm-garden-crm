import React from 'react';

export const STOCK_TRUNK_STANDARD_OPTIONS = [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
];

interface TrunkSizeSelectProps {
    value: number | null;
    onChange: (val: number | null) => void;
    className?: string;
    disabled?: boolean;
}

export const TrunkSizeSelect: React.FC<TrunkSizeSelectProps> = ({
    value,
    onChange,
    className,
    disabled
}) => {
    return (
        <select
            className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${className}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled}
        >
            <option value="">-- เลือกขนาด --</option>
            {STOCK_TRUNK_STANDARD_OPTIONS.map((size) => (
                <option key={size} value={size}>
                    {size} นิ้ว
                </option>
            ))}
        </select>
    );
};
