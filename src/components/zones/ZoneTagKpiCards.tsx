import React from "react";

type Props = {
    areaRai: number | null;
    totalSystem: number | null;
    totalTagged: number | null;
    totalRemaining: number | null;
    tagPct?: number | null;
    isDarkMode?: boolean;
};

export default function ZoneTagKpiCards({ areaRai, totalSystem, totalTagged, totalRemaining, tagPct: propTagPct, isDarkMode = false }: Props) {
    const system = totalSystem != null ? Number(totalSystem) : null;
    const tagged = totalTagged != null ? Number(totalTagged) : null;

    const remaining =
        totalRemaining != null
            ? Number(totalRemaining)
            : system != null && tagged != null
                ? Math.max(system - tagged, 0)
                : null;

    const remainingPerRai =
        remaining != null && areaRai != null && areaRai > 0 ? remaining / areaRai : null;

    // ใช้ tagPct จาก prop ถ้าส่งมา, ไม่งั้นคำนวณเอง
    const tagPct = propTagPct != null
        ? Number(propTagPct)
        : (system != null && system > 0 && tagged != null ? (tagged / system) * 100 : null);

    return (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Remaining / ไร่ Card */}
            <div className={`rounded-xl border p-3 flex flex-col ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Remaining / ไร่</div>

                <div className="mt-1.5 flex items-end justify-between gap-2">
                    <div className={`text-2xl font-semibold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {remainingPerRai == null ? "-" : remainingPerRai.toFixed(1)}
                        <span className={`ml-1 text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>ต้น/ไร่</span>
                    </div>

                    <div className="text-right">
                        <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-400"}`}>คงเหลือ</div>
                        <div className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                            {remaining == null ? "-" : remaining.toLocaleString()} ต้น
                        </div>
                    </div>
                </div>
            </div>

            {/* Tag Progress Card */}
            <div className={`rounded-xl border p-3 flex flex-col ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Tag Progress</div>

                <div className="mt-1.5 flex items-end justify-between gap-2">
                    <div className={`text-2xl font-semibold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {tagPct == null ? "-" : tagPct.toFixed(1)}
                        <span className={`ml-1 text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>%</span>
                    </div>

                    <div className="text-right">
                        <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-400"}`}>Tagged</div>
                        <div className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                            {tagged == null ? "-" : tagged.toLocaleString()} / {system == null ? "-" : system.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className={`mt-2 h-2 w-full rounded-full overflow-hidden ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}>
                    <div
                        className="h-full bg-sky-600"
                        style={{ width: `${Math.max(0, Math.min(100, tagPct ?? 0))}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

