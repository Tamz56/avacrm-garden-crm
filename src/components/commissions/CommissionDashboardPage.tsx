import React from "react";
import { reportCardClass } from "../../utils/ui";

export const CommissionDashboardPage: React.FC = () => {
    // TODO: Fetch real data from hooks/RPC
    const totalCommission = 0;
    const salesWithCommission = 0;
    const avgPerSale = 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                        ค่าคอมมิชชั่น (Commission Dashboard)
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        สรุปค่าคอมมิชชั่นทีมขายในแต่ละเดือน จากข้อมูลดีลที่ปิดแล้ว
                    </p>
                </div>

                {/* Filter - Right Side */}
                <div className="flex items-center gap-3">
                    <select
                        className="
              rounded-full border px-3 py-1.5 text-xs md:text-sm
              bg-white/80 border-slate-200 text-slate-700
              dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-emerald-500/70
            "
                    >
                        <option>เดือนนี้</option>
                        <option>เดือนที่แล้ว</option>
                        <option>3 เดือนล่าสุด</option>
                    </select>
                </div>
            </div>

            {/* TOP ROW – Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Card 1 – Total Commission */}
                <div className={reportCardClass}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                ค่าคอมฯ รวมเดือนนี้
                            </div>
                            <div className="mt-2 text-2xl font-semibold">
                                ฿{totalCommission.toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-emerald-500">
                                {/* Trend placeholder */}
                                +0% เทียบกับเดือนที่แล้ว
                            </div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                            ฿
                        </div>
                    </div>
                </div>

                {/* Card 2 – Sales Count */}
                <div className={reportCardClass}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                จำนวน Sales ที่มีค่าคอมฯ เดือนนี้
                            </div>
                            <div className="mt-2 text-2xl font-semibold">
                                {salesWithCommission}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                จาก Sales ทั้งหมด {salesWithCommission}
                            </div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                            👥
                        </div>
                    </div>
                </div>

                {/* Card 3 – Avg Commission */}
                <div className={reportCardClass}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                ค่าคอมฯ เฉลี่ยต่อดีล (เดือนนี้)
                            </div>
                            <div className="mt-2 text-2xl font-semibold">
                                ฿{avgPerSale.toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                เฉพาะดีลที่จ่ายค่าคอมฯ แล้ว
                            </div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                            %
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM ROW – Chart + Top Earners */}
            <div className="grid gap-4 lg:grid-cols-5">
                {/* Left: Commission Trend */}
                <div className={`lg:col-span-3 ${reportCardClass}`}>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-50">
                            เทรนด์ค่าคอมมิชชั่น 6 เดือนล่าสุด
                        </h2>
                        <div className="flex gap-2">
                            <button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                ตามเดือน
                            </button>
                            <button className="rounded-full px-3 py-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                                ตาม Sales
                            </button>
                        </div>
                    </div>

                    {/* Chart Placeholder */}
                    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300/70 dark:border-slate-700">
                        <span className="text-xs text-slate-400">
                            [ใส่กราฟ CommissionTrendChart ตรงนี้]
                        </span>
                    </div>
                </div>

                {/* Right: Top Earners */}
                <div className={`lg:col-span-2 ${reportCardClass}`}>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-50">
                            Top Commission Earners (เดือนนี้)
                        </h2>
                        <button className="text-xs text-emerald-500 hover:text-emerald-400">
                            ดูรายงานทั้งหมด
                        </button>
                    </div>

                    {/* Top Earners List Placeholder */}
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-2 text-xs
                           dark:bg-slate-800/80"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-semibold text-emerald-400">
                                        #{i}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-700 dark:text-slate-100">
                                            Sales {i}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            ดีลที่มีค่าคอมฯ 0 ดีล
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-50">
                                        ฿0
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        0% ของค่าคอมฯ ทั้งหมด
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Hint */}
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-500">
                        * ข้อมูลนี้แสดงเฉพาะดีลที่ปิดและคำนวณค่าคอมฯ แล้วในเดือนที่เลือก
                    </p>
                </div>
            </div>
        </div>
    );
};
