import React from "react";

type SummaryData = {
    total: number;
    available: number;
    reserved: number;
    digOrdered: number;
    dug: number;
    shipped: number;
    planted: number;
    untagged: number;
};

type Props = {
    summary: SummaryData;
    isDarkMode?: boolean;
};

export const SpeciesStockSummaryCards: React.FC<Props> = ({ summary, isDarkMode = false }) => {
    const cards = isDarkMode
        ? [
            { label: "ต้นทั้งหมด", value: summary.total, color: "text-white", bg: "border-slate-700 bg-slate-800" },
            { label: "พร้อมขาย", value: summary.available, color: "text-emerald-400", bg: "border-emerald-800 bg-emerald-900/30" },
            { label: "จองแล้ว", value: summary.reserved, color: "text-amber-400", bg: "border-slate-700 bg-slate-800" },
            { label: "ในใบสั่งขุด", value: summary.digOrdered, color: "text-slate-300", bg: "border-slate-700 bg-slate-800" },
            { label: "ขุดแล้ว", value: summary.dug, color: "text-slate-300", bg: "border-slate-700 bg-slate-800" },
            { label: "ส่งออกแล้ว", value: summary.shipped, color: "text-slate-300", bg: "border-slate-700 bg-slate-800" },
            { label: "ปลูกแล้ว", value: summary.planted, color: "text-slate-300", bg: "border-slate-700 bg-slate-800" },
            { label: "ยังไม่ Tag", value: summary.untagged, color: "text-amber-400", bg: "border-amber-800 bg-amber-900/30" },
        ]
        : [
            { label: "ต้นทั้งหมด", value: summary.total, color: "text-slate-900", bg: "border-slate-200 bg-white" },
            { label: "พร้อมขาย", value: summary.available, color: "text-emerald-700", bg: "border-emerald-200 bg-emerald-50" },
            { label: "จองแล้ว", value: summary.reserved, color: "text-amber-700", bg: "border-slate-200 bg-white" },
            { label: "ในใบสั่งขุด", value: summary.digOrdered, color: "text-slate-700", bg: "border-slate-200 bg-white" },
            { label: "ขุดแล้ว", value: summary.dug, color: "text-slate-700", bg: "border-slate-200 bg-white" },
            { label: "ส่งออกแล้ว", value: summary.shipped, color: "text-slate-700", bg: "border-slate-200 bg-white" },
            { label: "ปลูกแล้ว", value: summary.planted, color: "text-slate-700", bg: "border-slate-200 bg-white" },
            { label: "ยังไม่ Tag", value: summary.untagged, color: "text-amber-700", bg: "border-amber-200 bg-amber-50" },
        ];

    const labelColor = isDarkMode ? "text-slate-400" : "text-slate-500";

    return (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            {cards.map((card) => (
                <div key={card.label} className={`flex flex-col items-start rounded-xl border px-3 py-2 shadow-sm ${card.bg}`}>
                    <div className={`text-[10px] ${labelColor}`}>{card.label}</div>
                    <div className={`mt-1 text-lg font-semibold tabular-nums ${card.color}`}>{card.value.toLocaleString()}</div>
                </div>
            ))}
        </div>
    );
};
