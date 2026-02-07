import React from "react";
import { ChevronRight } from "lucide-react";
import { PREMIUM_STYLES } from "../../constants/ui";
import { HL } from "../../constants/deeplink";

const { SURFACE, SURFACE_HOVER, TITLE, MUTED } = PREMIUM_STYLES;

type ZonesSnapshotProps = {
    zones: any[];
    onOpenZone?: (id: string, opts?: any) => void;
    onOpenZonesList?: () => void;
    isDarkMode: boolean;
};

export const ZonesSnapshot: React.FC<ZonesSnapshotProps> = ({
    zones,
    onOpenZone,
    onOpenZonesList,
    isDarkMode,
}) => {
    // Calculate max total for percentage
    const maxTotal = Math.max(...zones.map(z => (z.total_tagged ?? 0) + (z.total_remaining_for_tag ?? 0)), 1);

    return (
        <div className={`flex flex-col p-4 ${SURFACE} ${SURFACE_HOVER}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium ${TITLE}`}>Top Zones</h3>
                {onOpenZonesList && (
                    <button
                        onClick={onOpenZonesList}
                        className={`text-xs transition-colors hover:text-emerald-500 ${MUTED}`}
                    >
                        ดูทั้งหมด
                    </button>
                )}
            </div>

            {zones.length === 0 ? (
                <div className={`text-center py-4 text-xs ${MUTED}`}>ยังไม่มีข้อมูลโซน</div>
            ) : (
                <div className="space-y-1">
                    {zones.map((z) => {
                        const total = (z.total_tagged ?? 0) + (z.total_remaining_for_tag ?? 0);
                        const percent = (total / maxTotal) * 100;

                        return (
                            <button
                                type="button"
                                key={z.id}
                                onClick={() => {
                                    if (onOpenZone && z.id) {
                                        onOpenZone(z.id, {
                                            source: 'dashboard_top_zones',
                                            focus: 'ready_from_tag', // Specific card focus
                                            hl: HL.READY_FROM_TAG     // Trigger one-shot highlight
                                        });
                                    }
                                }}
                                className={`relative w-full group flex items-center justify-between py-2 px-2 rounded-xl transition-all outline-none ${isDarkMode
                                    ? "hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-emerald-400/30"
                                    : "hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                                    }`}
                            >
                                {/* Progress Bar Background - Slightly more visible */}
                                <div
                                    className={`absolute bottom-0 left-2 right-2 h-[3px] rounded-full transition-all duration-500 opacity-0 group-hover:opacity-100 ${isDarkMode ? "bg-white/5" : "bg-slate-100"
                                        }`}
                                >
                                    <div
                                        className={`h-full rounded-full ${isDarkMode ? "bg-emerald-400/40" : "bg-emerald-500/30"
                                            }`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>

                                <div className="min-w-0 flex items-center gap-2.5 z-10 flex-1">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${z.total_tagged > 0 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "bg-slate-300 dark:bg-slate-600"}`} />
                                    <span className={`text-sm font-medium truncate mb-0.5 transition-colors group-hover:text-emerald-500 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                                        {z.name}
                                    </span>
                                </div>

                                {/* Quick Actions (Show on hover/group-focus) */}
                                <div className="hidden group-hover:flex items-center gap-1 mr-2 z-20">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenZone && onOpenZone(z.id, {
                                                source: 'dashboard_quick_action',
                                                hl: HL.READY_FROM_TAG
                                            });
                                        }}
                                        className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${isDarkMode
                                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                                            : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                                            }`}
                                        title="ไปที่การ์ดพร้อมขาย"
                                    >
                                        พร้อมขาย
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenZone && onOpenZone(z.id, {
                                                source: 'dashboard_quick_action',
                                                hl: HL.RESERVED_FROM_TAG
                                            });
                                        }}
                                        className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${isDarkMode
                                            ? "bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                                            : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                                            }`}
                                        title="ไปที่การ์ดจองแล้ว"
                                    >
                                        จองแล้ว
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenZone && onOpenZone(z.id, {
                                                source: 'dashboard_quick_action',
                                                hl: HL.LIFECYCLE_DUG
                                            });
                                        }}
                                        className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${isDarkMode
                                            ? "bg-sky-500/20 border-sky-500/30 text-sky-400 hover:bg-sky-500/30"
                                            : "bg-sky-50 border-sky-200 text-sky-600 hover:bg-sky-100"
                                            }`}
                                        title="ไปที่การ์ดขุดแล้ว"
                                    >
                                        ขุดแล้ว
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 z-10">
                                    <span className={`text-xs tabular-nums group-hover:hidden ${MUTED}`}>
                                        {total.toLocaleString()} <span className="opacity-70 text-[10px]">ต้น</span>
                                    </span>
                                    <ChevronRight
                                        className={`h-4 w-4 transition-all -mr-1 ${isDarkMode ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-600"} opacity-0 group-hover:opacity-100`}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
