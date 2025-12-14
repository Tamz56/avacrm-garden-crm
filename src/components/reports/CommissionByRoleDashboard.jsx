// src/components/reports/CommissionByRoleDashboard.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Users, DollarSign, SplitSquareHorizontal, Activity, AlertCircle } from "lucide-react";
import { supabase } from "../../supabaseClient.ts";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from "recharts";

const toBaht = (val) =>
    `฿${(val || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;

const toDateOnly = (d) => d.toISOString().slice(0, 10); // "YYYY-MM-DD"

const CommissionByRoleDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    const [rows, setRows] = useState([]);        // raw rows from view
    const [historyByMonth, setHistoryByMonth] = useState([]); // for chart

    // เดือนนี้ (วันที่ 1)
    const thisMonthDate = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }, []);

    const thisMonthKey = useMemo(() => toDateOnly(thisMonthDate), [thisMonthDate]);

    // โหลดข้อมูล 6 เดือนล่าสุดจาก view
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMsg(null);

            try {
                const fromDate = new Date(thisMonthDate.getFullYear(), thisMonthDate.getMonth() - 5, 1);
                const fromKey = toDateOnly(fromDate);

                const { data, error } = await supabase
                    .from("v_commission_by_person_month")
                    .select(
                        "month, full_name, referral_commission, sales_agent_commission, team_leader_commission, total_commission"
                    )
                    .gte("month", fromKey);

                if (error) throw error;

                const safeRows = (data || []).map((r) => ({
                    ...r,
                    // แปลงเป็น number ปลอดภัย
                    referral_commission: Number(r.referral_commission) || 0,
                    sales_agent_commission: Number(r.sales_agent_commission) || 0,
                    team_leader_commission: Number(r.team_leader_commission) || 0,
                    total_commission: Number(r.total_commission) || 0,
                }));

                setRows(safeRows);

                // รวมยอดต่อเดือนสำหรับกราฟ
                const byMonth = {};
                safeRows.forEach((r) => {
                    const key = r.month; // string "YYYY-MM-DD"
                    if (!byMonth[key]) {
                        byMonth[key] = {
                            month: key,
                            referral: 0,
                            sales: 0,
                            leader: 0,
                            total: 0,
                        };
                    }
                    byMonth[key].referral += r.referral_commission;
                    byMonth[key].sales += r.sales_agent_commission;
                    byMonth[key].leader += r.team_leader_commission;
                    byMonth[key].total += r.total_commission;
                });

                const historyArray = Object.values(byMonth).sort((a, b) =>
                    a.month > b.month ? 1 : -1
                );

                setHistoryByMonth(historyArray);
            } catch (err) {
                console.error(err);
                setErrorMsg(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลรายงานตามบทบาท");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [thisMonthDate]);

    // สรุปยอดทั้งทีมเดือนนี้ (by role)
    const thisMonthSummary = useMemo(() => {
        const monthRows = rows.filter((r) => r.month === thisMonthKey);

        const totalReferral = monthRows.reduce(
            (sum, r) => sum + r.referral_commission,
            0
        );
        const totalSalesAgent = monthRows.reduce(
            (sum, r) => sum + r.sales_agent_commission,
            0
        );
        const totalTeamLeader = monthRows.reduce(
            (sum, r) => sum + r.team_leader_commission,
            0
        );
        const totalAll = monthRows.reduce(
            (sum, r) => sum + r.total_commission,
            0
        );

        return {
            totalReferral,
            totalSalesAgent,
            totalTeamLeader,
            totalAll,
            numPeople: monthRows.length,
        };
    }, [rows, thisMonthKey]);

    // ตารางรายคนเดือนนี้
    const tableRows = useMemo(
        () =>
            rows
                .filter((r) => r.month === thisMonthKey)
                .sort((a, b) => b.total_commission - a.total_commission),
        [rows, thisMonthKey]
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    รายงานค่าคอมมิชชั่นตามบทบาท (By Role)
                </h2>
                <span className="text-xs text-gray-500">
                    ข้อมูลจาก view v_commission_by_person_month
                </span>
            </div>

            {/* Error */}
            {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">ค่าคอมฯ Referral เดือนนี้</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {toBaht(thisMonthSummary.totalReferral)}
                            </p>
                        </div>
                        <div className="rounded-full bg-emerald-50 p-3">
                            <Users className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">ค่าคอมฯ Sales Agent เดือนนี้</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {toBaht(thisMonthSummary.totalSalesAgent)}
                            </p>
                        </div>
                        <div className="rounded-full bg-blue-50 p-3">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">ค่าคอมฯ Team Leader เดือนนี้</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {toBaht(thisMonthSummary.totalTeamLeader)}
                            </p>
                        </div>
                        <div className="rounded-full bg-purple-50 p-3">
                            <SplitSquareHorizontal className="h-5 w-5 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">ค่าคอมฯ รวมทุกบทบาท (เดือนนี้)</p>
                            <p className="mt-1 text-2xl font-semibold">
                                {toBaht(thisMonthSummary.totalAll)}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                จาก {thisMonthSummary.numPeople} คน
                            </p>
                        </div>
                        <div className="rounded-full bg-gray-50 p-3">
                            <Activity className="h-5 w-5 text-gray-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart + Table */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Chart */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold">
                        ยอดค่าคอมฯ แยกตามบทบาท (6 เดือนล่าสุด)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyByMonth}>
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
                                <Legend />
                                <Bar dataKey="referral" stackId="a" name="Referral" fill="#10b981" />
                                <Bar dataKey="sales" stackId="a" name="Sales Agent" fill="#3b82f6" />
                                <Bar dataKey="leader" stackId="a" name="Team Leader" fill="#a855f7" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold">
                        ค่าคอมมิชชั่นตามบทบาท (เดือนนี้)
                    </h3>

                    {tableRows.length === 0 ? (
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
                                        <th className="px-3 py-2 text-right">Referral</th>
                                        <th className="px-3 py-2 text-right">Sales Agent</th>
                                        <th className="px-3 py-2 text-right">Team Leader</th>
                                        <th className="px-3 py-2 text-right">รวมทั้งหมด</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((row, idx) => (
                                        <tr key={`${row.full_name}-${idx}`} className="border-b last:border-0">
                                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                            <td className="px-3 py-2">{row.full_name}</td>
                                            <td className="px-3 py-2 text-right">
                                                {toBaht(row.referral_commission)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {toBaht(row.sales_agent_commission)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {toBaht(row.team_leader_commission)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {toBaht(row.total_commission)}
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
                    กำลังโหลดข้อมูลค่าคอมมิชชั่นตามบทบาทจาก Supabase...
                </p>
            )}
        </div>
    );
};

export default CommissionByRoleDashboard;
