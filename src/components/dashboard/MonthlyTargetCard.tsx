import React from 'react';

export const MonthlyTargetCard = ({ isDarkMode }: { isDarkMode?: boolean }) => {
    // Mock data for now
    const target = 600000; // ฿600k
    const current = 540000; // ฿540k

    const remaining = Math.max(target - current, 0);
    const progress = target > 0 ? (current / target) * 100 : 0;
    const percent = Math.round(progress);
    const barWidth = `${Math.min(100, Math.max(0, progress))}% `;

    const fmt = (n: number) => `฿${n.toLocaleString("th-TH")} `;

    // --- optional:required per day (until end of this month) ---
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = Math.max(
        1,
        Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const requiredPerDay = Math.ceil(remaining / daysLeft);

    const cardBase =
        "rounded-2xl p-6 shadow-md relative overflow-hidden bg-slate-900 text-white h-full flex flex-col justify-between";
    const cardBorder = isDarkMode ? " border border-slate-800" : "";

    return (
        <div className={`${cardBase}${cardBorder} `}>
            {/* Background decorations */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute bottom-0 right-4 w-16 h-16 bg-emerald-500/20 rounded-full" />

            <h3 className="text-sm font-medium text-slate-200 mb-2">
                Monthly revenue target
            </h3>

            <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-2">
                    <span className="text-3xl font-semibold tabular-nums">
                        {fmt(current)}
                    </span>
                    <span className="text-sm text-slate-400 mb-1 tabular-nums">
                        / {fmt(target)}
                    </span>
                </div>

                {/* Compact percent badge */}
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/10 border border-white/10 tabular-nums">
                    {Math.min(999, Math.max(0, progress)).toFixed(1)}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-2 bg-emerald-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: barWidth }}
                />
            </div>

            <p className="mt-2 text-xs text-emerald-300">
                🎉 Achieved {Math.min(100, Math.max(0, percent))}% of this month&apos;s target
            </p>

            {/* Executive stats row */}
            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                    <div className="text-[11px] text-white/60">คืบหน้า</div>
                    <div className="text-sm font-bold text-white tabular-nums">
                        {Math.min(100, Math.max(0, progress)).toFixed(1)}%
                    </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                    <div className="text-[11px] text-white/60">ยอดที่เหลือ</div>
                    <div className="text-sm font-bold text-white tabular-nums">
                        {fmt(remaining)}
                    </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                    <div className="text-[11px] text-white/60">ต้องได้/วัน</div>
                    <div className="text-sm font-bold text-white tabular-nums">
                        {fmt(requiredPerDay)}
                    </div>
                </div>
            </div>

            {/* Tiny helper line */}
            <div className="mt-2 text-[11px] text-white/50">
                เหลืออีก {daysLeft} วันในเดือนนี้
            </div>
        </div>
    );
};
