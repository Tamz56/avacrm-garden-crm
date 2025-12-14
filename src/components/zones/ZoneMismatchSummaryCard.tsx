import React from "react";
import type { ZoneMismatchOverviewRow } from "../../hooks/useZoneMismatchOverview";

type Props = {
    mismatch?: ZoneMismatchOverviewRow | null;
    loading?: boolean;
};

const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "-";
    return val.toLocaleString("th-TH");
};

export const ZoneMismatchSummaryCard: React.FC<Props> = ({
    mismatch,
    loading = false,
}) => {
    return (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-800">
                    สรุปความคลาดเคลื่อนของแปลง
                </div>

                {loading ? (
                    <span className="animate-pulse rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-400">
                        กำลังโหลด...
                    </span>
                ) : mismatch ? (
                    <span
                        className={[
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                            mismatch.mismatch_status?.includes("คลาดเคลื่อนมาก")
                                ? "bg-red-50 text-red-700"
                                : mismatch.mismatch_status?.includes("ปานกลาง")
                                    ? "bg-orange-50 text-orange-700"
                                    : mismatch.mismatch_status?.includes("เล็กน้อย")
                                        ? "bg-amber-50 text-amber-700"
                                        : mismatch.mismatch_status?.includes("ตรงตามระบบ")
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-50 text-slate-600",
                        ].join(" ")}
                    >
                        {mismatch.mismatch_status ?? "ยังไม่สำรวจ"}
                    </span>
                ) : (
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500">
                        ยังไม่มีข้อมูลสำรวจ
                    </span>
                )}
            </div>

            {/* ถ้ายังโหลด หรือไม่มีข้อมูล ก็ไม่ต้องโชว์รายละเอียดเพิ่ม */}
            {!loading && mismatch && (
                <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2 md:grid-cols-4">
                    <div>
                        <div className="text-slate-400">ทิศทางความคลาดเคลื่อน</div>
                        <div className="font-medium">
                            {mismatch.diff_direction ?? "-"}
                        </div>
                    </div>

                    <div>
                        <div className="text-slate-400">จำนวนในระบบ</div>
                        <div className="font-medium">{formatNumber(mismatch.system_qty)} ต้น</div>
                    </div>

                    <div>
                        <div className="text-slate-400">จำนวนที่สำรวจ</div>
                        <div className="font-medium">
                            {mismatch.inspected_qty === null
                                ? "ยังไม่สำรวจ"
                                : `${formatNumber(mismatch.inspected_qty)} ต้น`}
                        </div>
                    </div>

                    <div>
                        <div className="text-slate-400">ต่างจากระบบ</div>
                        <div
                            className={[
                                "font-semibold",
                                (mismatch.diff_qty ?? 0) > 0
                                    ? "text-emerald-600"
                                    : (mismatch.diff_qty ?? 0) < 0
                                        ? "text-red-600"
                                        : "text-slate-600",
                            ].join(" ")}
                        >
                            {mismatch.diff_qty === null
                                ? "-"
                                : `${mismatch.diff_qty > 0 ? "+" : ""}${formatNumber(
                                    mismatch.diff_qty
                                )} ต้น`}
                        </div>
                    </div>

                    <div className="sm:col-span-2 md:col-span-4 mt-1">
                        <div className="text-slate-400">วันที่สำรวจล่าสุด</div>
                        <div className="font-medium">
                            {mismatch.last_inspection_date
                                ? new Date(mismatch.last_inspection_date).toLocaleDateString(
                                    "th-TH",
                                    { year: "numeric", month: "short", day: "numeric" }
                                )
                                : "ยังไม่มีการสำรวจ"}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
