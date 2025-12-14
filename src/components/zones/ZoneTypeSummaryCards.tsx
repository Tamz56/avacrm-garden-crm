import React from "react";
import { Sprout, FlaskConical, Trees, HelpCircle } from "lucide-react";
import type { ZoneTypeSummary } from "../../types/zoneSummary";

type Props = {
    items: ZoneTypeSummary[];
    totalZones?: number;
    totalPlannedTrees?: number;
};

export const ZoneTypeSummaryCards: React.FC<Props> = ({
    items,
    totalZones,
    totalPlannedTrees,
}) => {
    const iconByKey: Record<string, React.ReactNode> = {
        production: <Trees className="w-5 h-5" />,
        trial: <FlaskConical className="w-5 h-5" />,
        nursery: <Sprout className="w-5 h-5" />,
        untyped: <HelpCircle className="w-5 h-5" />,
    };

    const badgeColorByKey: Record<string, string> = {
        production: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        trial: "bg-amber-50 text-amber-700 ring-amber-100",
        nursery: "bg-sky-50 text-sky-700 ring-sky-100",
        untyped: "bg-slate-50 text-slate-700 ring-slate-100",
    };

    return (
        <div className="space-y-3">
            {/* แถวสรุปภาพรวมทั้งหมด */}
            {(totalZones ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">
                        รวมทั้งหมด {totalZones} แปลง
                    </span>
                    {typeof totalPlannedTrees === "number" && (
                        <span className="text-slate-500">
                            แผนปลูกรวม{" "}
                            <span className="font-semibold text-slate-800">
                                {totalPlannedTrees.toLocaleString("th-TH")}
                            </span>{" "}
                            ต้น
                        </span>
                    )}
                </div>
            )}

            {/* การ์ดแต่ละประเภท */}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {items.map((item) => {
                    const badgeColor =
                        badgeColorByKey[item.key] ?? "bg-slate-50 text-slate-700";
                    const icon = iconByKey[item.key] ?? (
                        <HelpCircle className="w-5 h-5" />
                    );

                    return (
                        <div
                            key={item.key}
                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full ${badgeColor}`}
                                    >
                                        {icon}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            ประเภทแปลง
                                        </span>
                                        <span className="text-sm font-semibold text-slate-900">
                                            {item.label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-1 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-slate-500">จำนวนแปลง</span>
                                    <span className="font-semibold text-slate-900">
                                        {item.zoneCount.toLocaleString("th-TH")} แปลง
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-slate-500">พื้นที่รวม</span>
                                    <span className="font-semibold text-slate-900">
                                        {item.areaRai.toLocaleString("th-TH")} ไร่
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between gap-2 sm:col-span-2">
                                    <span className="text-slate-500">จำนวนต้นตามแผน</span>
                                    <span className="font-semibold text-emerald-700">
                                        {item.plannedTrees.toLocaleString("th-TH")} ต้น
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
