import React, { useEffect, useMemo, useState } from "react";
import { DollarSign, Users, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "../../supabaseClient.ts";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

const toBaht = (val) =>
    `฿${(val || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;

// Helper: Format Date to YYYY-MM-DD (Local Time Safe)
const toDateOnly = (date) => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const CommissionDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    const [teamMonthly, setTeamMonthly] = useState([]);
    const [topThisMonth, setTopThisMonth] = useState([]);
    const [baseTotalThisMonth, setBaseTotalThisMonth] = useState(0);

    // เดือนนี้ (ใช้วันที่ 1 ของเดือน)
    const thisMonthDate = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }, []);

    // Key สำหรับเดือนนี้ (YYYY-MM-DD)
    const thisMonthKey = useMemo(() => toDateOnly(thisMonthDate), [thisMonthDate]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMsg(null);

            try {
                // -------- 1) ดึงข้อมูลจาก view v_commission_by_person_month --------
                const { data, error } = await supabase
                    .from("v_commission_by_person_month")
                    .select(`
                        month, 
                        full_name, 
                        total_commission,
                        team_override_commission,
                        total_commission_with_override
                    `)
                    .gte(
                        "month",
                        new Date(
                            thisMonthDate.getFullYear(),
                            thisMonthDate.getMonth() - 5,
                            1
                        ).toISOString()
                    );

                if (error) throw error;

                const rows = data || [];

                // รวมยอดทั้งทีม แยกตามเดือน
                const byMonth = {};
                rows.forEach((r) => {
                    // แปลงเดือนจาก DB ให้เป็น YYYY-MM-DD เพื่อความชัวร์ (ตัดเวลาทิ้งถ้ามี)
                    const key = r.month.slice(0, 10);
                    const amt = Number(r.total_commission_with_override) || 0;
                    byMonth[key] = (byMonth[key] || 0) + amt;
                });

                const teamMonthlyArray = Object.entries(byMonth)
                    .map(([month, total]) => ({ month, total }))
                    .sort((a, b) => (a.month > b.month ? 1 : -1));

                setTeamMonthly(teamMonthlyArray);

                // filter เอาเฉพาะเดือนนี้ แล้ว sort เพื่อทำ Top Sales
                // ใช้ thisMonthKey (YYYY-MM-DD) เทียบกับ r.month (ตัด 10 ตัวแรก)
                const thisMonthRows = rows.filter(
                    (r) => r.month.slice(0, 10) === thisMonthKey
                );

                // คำนวณ Base Total สำหรับเดือนนี้ (ก่อนรวม Override)
                const baseTotal = thisMonthRows.reduce(
                    (sum, row) => sum + (Number(row.total_commission) || 0),
                    0
                );
                setBaseTotalThisMonth(baseTotal);

                thisMonthRows.sort(
                    (a, b) =>
                        Number(b.total_commission_with_override) - Number(a.total_commission_with_override)
                );
                setTopThisMonth(thisMonthRows.slice(0, 10));
            } catch (err) {
                console.error(err);
                setErrorMsg(
                    err?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลค่าคอมมิชชั่น"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [thisMonthDate, thisMonthKey]);

    // ค่าการ์ดสรุป
    const summary = useMemo(() => {
        const teamTotal =
            teamMonthly.find((m) => m.month === thisMonthKey)?.total || 0;
        const numSales = topThisMonth.length;
        const avg = numSales > 0 ? teamTotal / numSales : 0;
        return { teamTotal, numSales, avg };
    }, [teamMonthly, topThisMonth, thisMonthKey]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    รายงานค่าคอมมิชชั่น (Commission Dashboard)
                </h2>
                <span className="text-xs text-gray-500">
                    ข้อมูลจาก view v_commission_by_person_month
                </span>
            </div>

            {/* Error box */}
            {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">ค่าคอมฯ รวมเดือนนี้</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {toBaht(summary.teamTotal)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                                ก่อนรวม override: {toBaht(baseTotalThisMonth)}
                            </p>
                        </div>
                        <div className="rounded-full bg-emerald-50 p-3">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">
                                จำนวน Sales ที่มีค่าคอมฯ เดือนนี้
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                                {summary.numSales}
                            </p>
                        </div>
                        <div className="rounded-full bg-blue-50 p-3">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">
                                ค่าคอมฯ เฉลี่ยต่อ Sales (เดือนนี้)
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                                {toBaht(summary.avg)}
                            </p>
                        </div>
                        <div className="rounded-full bg-purple-50 p-3">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart + table */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Team commission by month */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold">
                        ยอดค่าคอมฯ รวมต่อเดือน (6 เดือนล่าสุด)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamMonthly}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={(value) =>
                                        new Date(value).toLocaleDateString("th-TH", {
                                            month: "short",
                                            year: "2-digit",
                                        })
                                    }
                                />
                                <YAxis />
                                <Tooltip
                                    formatter={(val) => toBaht(Number(val))}
                                    labelFormatter={(label) =>
                                        new Date(label).toLocaleDateString("th-TH", {
                                            month: "long",
                                            year: "numeric",
                                        })
                                    }
                                />
                                <Bar dataKey="total" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top earners this month */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold">
                        Top Commission Earners (เดือนนี้)
                    </h3>
                    {topThisMonth.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            ยังไม่มีข้อมูลค่าคอมฯ สำหรับเดือนนี้
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50 text-left">
                                        <th className="px-3 py-2">#</th>
                                        <th className="px-3 py-2">ชื่อ</th>
                                        <th className="px-3 py-2 text-right">ค่าคอมฯ รวม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topThisMonth.map((row, idx) => (
                                        <tr key={row.full_name} className="border-b last:border-0">
                                            <td className="px-3 py-2 text-gray-500">
                                                {idx + 1}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div>{row.full_name}</div>
                                                {Number(row.team_override_commission) > 0 && (
                                                    <div className="text-[10px] text-emerald-600">
                                                        +Override: {toBaht(row.team_override_commission)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="font-medium">
                                                    {toBaht(Number(row.total_commission_with_override))}
                                                </div>
                                                {Number(row.team_override_commission) > 0 && (
                                                    <div className="text-[10px] text-gray-400">
                                                        (Base: {toBaht(row.total_commission)})
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {loading && (
                <p className="text-xs text-gray-400">
                    กำลังโหลดข้อมูลค่าคอมฯ จาก Supabase...
                </p>
            )}
        </div>
    );
};

export default CommissionDashboard;
