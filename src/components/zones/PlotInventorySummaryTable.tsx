import React from "react";
import { Plus, Loader2 } from "lucide-react";
import { PlotPlanVsTaggedRow } from "../../hooks/usePlotPlanVsTagged";

type SpeciesMap = Record<string, { name_th: string; name?: string }>;

type Props = {
    rows: PlotPlanVsTaggedRow[];
    loading: boolean;
    error: string | null;
    speciesMap: SpeciesMap;
    onCreateTag?: (row: PlotPlanVsTaggedRow) => void;
};

export const PlotInventorySummaryTable: React.FC<Props> = ({
    rows,
    loading,
    error,
    speciesMap,
    onCreateTag,
}) => {
    if (loading) {
        return (
            <div className="py-8 text-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                กำลังโหลดข้อมูล...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                โหลดข้อมูลไม่สำเร็จ: {error}
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="py-8 text-center text-slate-400 text-sm">
                ยังไม่มีข้อมูลต้นไม้ในแปลงนี้
            </div>
        );
    }

    // Calculate totals (fix: remaining never negative)
    const totalSystem = rows.reduce((sum, r) => sum + r.total_system, 0);
    const totalTagged = rows.reduce((sum, r) => sum + r.total_tagged, 0);
    const totalRemaining = Math.max(totalSystem - totalTagged, 0);
    const overallTagPct = totalSystem > 0
        ? Math.min((totalTagged / totalSystem) * 100, 100)
        : (totalTagged > 0 ? 100 : 0);

    return (
        <div className="space-y-4">
            {/* Summary Header */}
            <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                    <div className="text-xs text-slate-500">ระบบทั้งหมด</div>
                    <div className="text-lg font-bold text-slate-800">{totalSystem.toLocaleString("th-TH")}</div>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
                    <div className="text-xs text-sky-600">Tag แล้ว</div>
                    <div className="text-lg font-bold text-sky-700">{totalTagged.toLocaleString("th-TH")}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                    <div className="text-xs text-amber-600">คงเหลือ</div>
                    <div className="text-lg font-bold text-amber-700">{totalRemaining.toLocaleString("th-TH")}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                    <div className="text-xs text-emerald-600">Tag Progress</div>
                    <div className="text-lg font-bold text-emerald-700">{overallTagPct.toFixed(1)}%</div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium">ชนิด/พันธุ์</th>
                            <th className="px-4 py-2 text-left font-medium">ขนาด</th>
                            <th className="px-4 py-2 text-right font-medium">ระบบ</th>
                            <th className="px-4 py-2 text-right font-medium">Tag แล้ว</th>
                            <th className="px-4 py-2 text-right font-medium">คงเหลือ</th>
                            <th className="px-4 py-2 text-center font-medium">Progress</th>
                            <th className="px-4 py-2 text-right font-medium">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const speciesName = speciesMap[row.species_id]?.name_th || speciesMap[row.species_id]?.name || row.species_id.slice(0, 8);

                            // Fix: remaining never negative, pct capped at 100
                            const displayRemaining = Math.max(row.total_remaining, 0);
                            const isOverPlan = row.total_system === 0 && row.total_tagged > 0;
                            const isExceeded = row.total_tagged > row.total_system && row.total_system > 0;

                            const pct = row.total_system > 0
                                ? Math.min(row.tag_pct, 100)
                                : (row.total_tagged > 0 ? 100 : 0);

                            const barColor = pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-sky-500" : "bg-amber-500";

                            return (
                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 text-slate-800 font-medium">
                                        {speciesName}
                                        {isOverPlan && (
                                            <span className="ml-1 text-[10px] text-amber-600 font-normal">(ยังไม่ตั้งแผน)</span>
                                        )}
                                        {isExceeded && (
                                            <span className="ml-1 text-[10px] text-red-500 font-normal">(เกินแผน)</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">{row.size_label || "-"}</td>
                                    <td className="px-4 py-2 text-right text-slate-700">
                                        {row.total_system.toLocaleString("th-TH")}
                                        {row.total_system === 0 && (
                                            <span className="text-amber-500 text-[10px]"> ⚠</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sky-600 font-medium">{row.total_tagged.toLocaleString("th-TH")}</td>
                                    <td className="px-4 py-2 text-right text-amber-600">{displayRemaining.toLocaleString("th-TH")}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${barColor} transition-all`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500 w-12 text-right">{pct.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {onCreateTag && (
                                            <button
                                                type="button"
                                                onClick={() => onCreateTag(row)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                                            >
                                                <Plus className="h-3 w-3" />
                                                สร้าง Tag
                                            </button>
                                        )}
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
