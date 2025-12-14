import React, { useMemo } from "react";
import { getStockStatus, getStockStatusClassName, getStockStatusLabel } from "../utils/stockStatus";
import type { ZoneStockSummary } from "../hooks/useZoneStockSummary";

interface ZoneDetailPanelProps {
    rows: ZoneStockSummary[];
}

export const ZoneDetailPanel: React.FC<ZoneDetailPanelProps> = ({ rows }) => {
    if (!rows || rows.length === 0) {
        return (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-400">
                เลือกโซนทางซ้ายเพื่อดูรายละเอียดต้นไม้
            </div>
        );
    }

    const zoneName = rows[0].zone_name;

    const totalPlanned = rows.reduce(
        (sum, r) => sum + (r.planned_trees ?? 0),
        0
    );
    const totalRemaining = rows.reduce(
        (sum, r) => sum + (r.remaining_trees ?? 0),
        0
    );
    const totalValue = rows.reduce(
        (sum, r) => sum + (r.estimated_value ?? 0),
        0
    );

    // group by species
    const uniqueSpecies = useMemo(
        () => Array.from(new Set(rows.map((r) => r.species))).filter(Boolean),
        [rows]
    );

    return (
        <div className="rounded-2xl border bg-white p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">
                        รายละเอียดโซน: {zoneName}
                    </h3>
                    {uniqueSpecies.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                            ชนิดไม้ในโซนนี้: {uniqueSpecies.join(", ")}
                        </p>
                    )}
                </div>
                <div className="text-right text-xs text-slate-500">
                    <div>ตามแผน: {totalPlanned.toLocaleString()} ต้น</div>
                    <div>คงเหลือ: {totalRemaining.toLocaleString()} ต้น</div>
                    <div>มูลค่าประมาณ: ฿{totalValue.toLocaleString()}</div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                            <th className="px-3 py-2 text-left">สายพันธุ์</th>
                            <th className="px-3 py-2 text-left">ขนาด</th>
                            <th className="px-3 py-2 text-right">ตามแผน</th>
                            <th className="px-3 py-2 text-right">คงเหลือ</th>
                            <th className="px-3 py-2 text-right">ราคา/ต้น</th>
                            <th className="px-3 py-2 text-right">มูลค่าประมาณ</th>
                            <th className="px-3 py-2 text-center">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((r) => {
                            const status = getStockStatus(r.remaining_trees, r.planned_trees);

                            return (
                                <tr key={r.zone_id + r.size_label + r.species}>
                                    <td className="px-3 py-2">{r.species}</td>
                                    <td className="px-3 py-2">{r.size_label}</td>
                                    <td className="px-3 py-2 text-right">
                                        {r.planned_trees?.toLocaleString() ?? 0}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {r.remaining_trees?.toLocaleString() ?? 0}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {r.avg_price
                                            ? `฿${r.avg_price.toLocaleString()}`
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {r.estimated_value
                                            ? `฿${r.estimated_value.toLocaleString()}`
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span
                                            className={
                                                "inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-medium " +
                                                getStockStatusClassName(status)
                                            }
                                        >
                                            {getStockStatusLabel(status)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
