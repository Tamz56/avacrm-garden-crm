import React from "react";
import type { ZoneMismatchOverviewRow } from "../../hooks/useZoneMismatchOverview";

type Props = {
    mismatch?: ZoneMismatchOverviewRow | null;
};

const formatNum = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "-";
    return val.toLocaleString("th-TH");
};

export const ZoneMismatchBadge: React.FC<Props> = ({ mismatch }) => {
    if (!mismatch) {
        return (
            <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-500/20 px-3 py-1 text-xs text-slate-500 dark:text-slate-400">
                ยังไม่สำรวจ
            </span>
        );
    }

    const status = mismatch.mismatch_status ?? "ยังไม่สำรวจ";

    const badgeColor =
        status.includes("คลาดเคลื่อนมาก")
            ? "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400"
            : status.includes("ปานกลาง")
                ? "bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                : status.includes("เล็กน้อย")
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                    : status.includes("ตรงตามระบบ")
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-slate-50 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400";

    return (
        <div className="group relative inline-flex">
            {/* ป้ายสถานะหลักในตาราง */}
            <span
                className={[
                    "inline-flex cursor-default items-center rounded-full px-3 py-1 text-xs font-medium",
                    badgeColor,
                ].join(" ")}
            >
                {status}
            </span>

            {/* Tooltip */}
            <div
                className="
          pointer-events-none
          absolute left-0 top-[110%] z-50
          hidden
          min-w-[240px] max-w-xs
          rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800
          px-3 py-2
          text-[11px] text-slate-700 dark:text-slate-300
          shadow-lg
          group-hover:block
        "
            >
                <div className="mb-1 font-semibold text-slate-900 dark:text-slate-200">
                    รายละเอียดความคลาดเคลื่อน
                </div>

                {/* 👇 สำคัญ: ใช้ whitespace-normal เพื่อให้ขึ้นบรรทัดใหม่ได้ */}
                <div className="space-y-0.5 whitespace-normal">
                    <div>
                        <span className="text-slate-400">สถานะ: </span>
                        <span>{status}</span>
                    </div>

                    <div>
                        <span className="text-slate-400">ทิศทาง: </span>
                        <span>{mismatch.diff_direction ?? "-"}</span>
                    </div>

                    <div>
                        <span className="text-slate-400">ระบบ: </span>
                        <span>{formatNum(mismatch.system_qty)} ต้น</span>

                        <span className="text-slate-400"> | สำรวจ: </span>
                        <span>{formatNum(mismatch.inspected_qty)} ต้น</span>

                        <span className="text-slate-400"> | คลาดเคลื่อน: </span>
                        <span>
                            {mismatch.diff_qty === null
                                ? "-"
                                : `${mismatch.diff_qty > 0 ? "+" : ""}${formatNum(
                                    mismatch.diff_qty
                                )} ต้น`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
