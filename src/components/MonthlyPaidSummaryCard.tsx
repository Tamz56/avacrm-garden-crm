import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, Calendar, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

type DailyRow = {
    day: string; // ISO date string
    total_revenue: number;
    total_deals: number;
};

interface MonthlyPaidSummaryCardProps {
    year?: number;
    month?: number; // 1-12, default = เดือนปัจจุบัน
    // Props ที่รับมาจาก Parent
    totalRevenue?: number;
    totalDeals?: number;
    totalCustomers?: number;
    avgDealAmount?: number;
    loading?: boolean;
    error?: string | null;
}

const formatBaht = (val: number | null | undefined) =>
    `฿${(val || 0).toLocaleString("th-TH", {
        maximumFractionDigits: 0,
    })}`;

const formatThaiMonthYear = (year: number, month: number) => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
    });
};

const MonthlyPaidSummaryCard: React.FC<MonthlyPaidSummaryCardProps> = ({
    year,
    month,
    totalRevenue = 0,
    totalDeals = 0,
    totalCustomers = 0,
    avgDealAmount = 0,
    loading = false,
    error = null,
}) => {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    // State สำหรับกราฟรายวัน (ยังคงดึงเองภายใน)
    const [daily, setDaily] = useState<DailyRow[]>([]);
    const [chartLoading, setChartLoading] = useState<boolean>(false);

    const periodLabel = useMemo(
        () => formatThaiMonthYear(y, m),
        [y, m]
    );

    useEffect(() => {
        const fetchDailyData = async () => {
            setChartLoading(true);
            try {
                // เรียก daily breakdown สำหรับกราฟ
                const { data: dailyData, error: dailyErr } =
                    await supabase.rpc("get_paid_deals_daily_for_month", {
                        p_year: y,
                        p_month: m,
                    });

                if (dailyErr) {
                    console.error("get_paid_deals_daily_for_month error:", dailyErr);
                    // ไม่ throw error เพื่อไม่ให้กระทบการแสดงผลหลัก
                }

                setDaily(
                    (dailyData as DailyRow[] | null)?.map((row) => ({
                        ...row,
                        // เผื่อ backend ส่งเป็น Date object → บังคับให้เป็น string
                        day:
                            typeof row.day === "string"
                                ? row.day
                                : new Date(row.day as any).toISOString(),
                    })) ?? []
                );
            } catch (e: any) {
                console.error("Error fetching daily chart data:", e);
            } finally {
                setChartLoading(false);
            }
        };

        fetchDailyData();
    }, [y, m]);

    const chartData = useMemo(
        () =>
            daily.map((d) => ({
                dateLabel: new Date(d.day).getDate().toString(),
                total_revenue: d.total_revenue,
                total_deals: d.total_deals,
            })),
        [daily]
    );

    // ใช้ loading หรือ error จาก props หรือ internal chart loading
    const isLoading = loading || chartLoading;
    const displayError = error;

    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 h-full flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        ยอดรับชำระเดือนนี้
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <p className="text-sm font-medium text-slate-600">
                            {periodLabel}
                        </p>
                    </div>
                </div>

                {isLoading && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        กำลังโหลด...
                    </div>
                )}
            </div>

            {displayError && (
                <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-100">
                    {displayError}
                </div>
            )}

            {/* Main Number */}
            <div className="mb-6">
                <div className="text-4xl font-semibold tracking-tight text-emerald-600">
                    {formatBaht(totalRevenue)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                    ยอดรวมจากดีลที่รับชำระแล้วในเดือนนี้
                </p>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 gap-6 text-xs border-t border-slate-100 pt-6">
                <div>
                    <p className="text-slate-500">จำนวนดีล</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {totalDeals} ดีล
                    </p>
                </div>
                <div>
                    <p className="text-slate-500">ลูกค้า</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {totalCustomers} ราย
                    </p>
                </div>
                <div>
                    <p className="text-slate-500">เฉลี่ย/ดีล</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatBaht(avgDealAmount)}
                    </p>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-48 mt-6 -mx-2">
                {chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl mx-2">
                        ยังไม่มียอดชำระในเดือนนี้
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="dateLabel"
                                tickLine={false}
                                axisLine={{ stroke: "#e2e8f0" }}
                                tick={{ fontSize: 11, fill: "#64748b" }}
                                minTickGap={15}
                                dy={10}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 11, fill: "#64748b" }}
                                tickFormatter={(v) =>
                                    v >= 1000000
                                        ? `${Math.round(v / 1000000)}M`
                                        : v >= 1000
                                            ? `${Math.round(v / 1000)}k`
                                            : `${v}`
                                }
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#ffffff",
                                    borderRadius: 12,
                                    border: "1px solid #e2e8f0",
                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    fontSize: 12,
                                    color: "#1e293b"
                                }}
                                itemStyle={{ color: "#16a34a", fontWeight: 600 }}
                                formatter={(value: any) => [formatBaht(value as number), "ยอดขาย"]}
                                labelFormatter={(label: any) => `วันที่ ${label}`}
                                cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="total_revenue"
                                stroke="#16a34a"
                                strokeWidth={3}
                                dot={{ r: 3, strokeWidth: 2, stroke: "#ffffff", fill: "#16a34a" }}
                                activeDot={{ r: 6, strokeWidth: 0, fill: "#16a34a" }}
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default MonthlyPaidSummaryCard;
