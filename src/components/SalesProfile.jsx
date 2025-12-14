// src/components/SalesProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient.ts";
import { ArrowLeft, Filter, DollarSign, Trophy } from "lucide-react";

const TIME_RANGE_OPTIONS = [
    { id: "all", label: "ทั้งหมด" },
    { id: "this_year", label: "ปีนี้" },
    { id: "last_90_days", label: "90 วันที่ผ่านมา" },
    { id: "last_30_days", label: "30 วันที่ผ่านมา" },
];

const formatBaht = (val) =>
    `฿${(val || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;

const formatPercent = (val) =>
    `${(val || 0).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`;

// Helper function for date formatting (Local Time)
const formatDateForSupabase = (date) => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const SalesProfile = ({ salesId, salesName, onBack }) => {
    const [timeRange, setTimeRange] = useState("this_year");
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // คำนวณช่วงเวลา (แก้ Timezone ให้เป็น Local Time)
    const { fromDate, toDate } = useMemo(() => {
        const now = new Date();
        let from = null;

        switch (timeRange) {
            case "this_year":
                from = new Date(now.getFullYear(), 0, 1);
                break;
            case "last_90_days":
                from = new Date(now);
                from.setDate(from.getDate() - 90);
                break;
            case "last_30_days":
                from = new Date(now);
                from.setDate(from.getDate() - 30);
                break;
            case "all":
            default:
                from = null;
        }

        return {
            fromDate: from ? formatDateForSupabase(from) : null,
            toDate: formatDateForSupabase(now),
        };
    }, [timeRange]);

    // โหลดดีลของเซลส์คนนี้
    useEffect(() => {
        if (!salesId) return;

        const fetchDeals = async () => {
            setLoading(true);
            setError(null);

            try {
                let query = supabase
                    .from("deals")
                    .select(
                        "id, deal_code, stage, total_amount, owner_id, closing_date"
                    )
                    // 👇 สำคัญ: filter ด้วย owner_id ให้ตรง schema
                    .eq("owner_id", salesId);

                if (fromDate) {
                    query = query
                        .gte("closing_date", fromDate)
                        .lte("closing_date", toDate);
                }

                const { data: dealRows, error: dealsErr } = await query;

                if (dealsErr) throw dealsErr;
                setDeals(dealRows || []);
            } catch (err) {
                console.error("SalesProfile fetch error:", err);
                setError("โหลดข้อมูลดีลไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        };

        fetchDeals();
    }, [salesId, timeRange, fromDate, toDate]);

    // คำนวณสรุปจาก deals
    const {
        totalRevenue,
        totalDeals,
        wonDeals,
        winRate,
        monthlyDeals,
    } = useMemo(() => {
        if (!deals || deals.length === 0) {
            return {
                totalRevenue: 0,
                totalDeals: 0,
                wonDeals: 0,
                winRate: 0,
                monthlyDeals: [],
            };
        }

        let totalRevenue = 0;
        let totalDeals = deals.length;
        let wonDeals = 0;
        let lostDeals = 0;

        const monthlyMap = {}; // key: YYYY-MM -> { amount, deals }

        const ensureMonthly = (key) => {
            if (!monthlyMap[key]) {
                monthlyMap[key] = { amount: 0, deals: 0 };
            }
            return monthlyMap[key];
        };

        for (const d of deals) {
            const amount = Number(d.total_amount || 0);
            const stage = d.stage || "inquiry";

            if (stage === "won") {
                totalRevenue += amount;
                wonDeals += 1;
            } else if (stage === "lost") {
                lostDeals += 1;
            }

            const closingDate = d.closing_date ? new Date(d.closing_date) : null;
            const monthKey = closingDate
                ? `${closingDate.getFullYear()}-${String(
                    closingDate.getMonth() + 1
                ).padStart(2, "0")}`
                : "unknown";

            const m = ensureMonthly(monthKey);
            m.amount += amount;
            m.deals += 1;
        }

        const closed = wonDeals + lostDeals;
        const winRate = closed ? (wonDeals / closed) * 100 : 0;

        const monthlyDeals = Object.entries(monthlyMap)
            .filter(([key]) => key !== "unknown")
            .map(([key, v]) => {
                const [y, m] = key.split("-");
                const d = new Date(Number(y), Number(m) - 1, 1);
                const label = d.toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "short",
                });
                return {
                    key,
                    label,
                    amount: v.amount,
                    deals: v.deals,
                };
            })
            .sort((a, b) => (a.key > b.key ? 1 : -1));

        return { totalRevenue, totalDeals, wonDeals, winRate, monthlyDeals };
    }, [deals]);

    // ---------- UI ----------
    if (!salesId) {
        return (
            <div className="p-6">
                <p className="text-sm text-slate-500">
                    ยังไม่ได้เลือก Sales จาก Dashboard
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6">
                <p className="text-sm text-slate-500">
                    กำลังโหลดข้อมูลของ {salesName || "Sales"}...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft size={16} className="mr-1" />
                        กลับไป Dashboard
                    </button>
                </div>
                <p className="text-sm text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft size={16} className="mr-1" />
                        กลับไป Dashboard
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">
                            Sales Profile – {salesName || "ไม่ทราบชื่อ"}
                        </h1>
                        <p className="text-sm text-slate-500">
                            สรุปผลงานการขายและค่าคอมมิชชั่นในช่วงเวลาที่เลือก
                        </p>
                    </div>
                </div>

                {/* ตัวเลือกช่วงเวลา */}
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
                    <Filter size={16} className="text-slate-400" />
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="text-sm outline-none bg-transparent"
                    >
                        {TIME_RANGE_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* ยอดขายรวม */}
                <div className="bg-white rounded-xl border p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            ยอดขายรวม (ดีล Won)
                        </span>
                        <DollarSign size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {formatBaht(totalRevenue)}
                    </div>
                </div>

                {/* จำนวนดีล */}
                <div className="bg-white rounded-xl border p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            ดีลทั้งหมด / ดีล Won
                        </span>
                        <Trophy size={16} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {totalDeals} / {wonDeals} ดีล
                    </div>
                </div>

                {/* Win Rate */}
                <div className="bg-white rounded-xl border p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Win Rate</span>
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {formatPercent(winRate)}
                    </div>
                </div>

                {/* Placeholder ค่าคอมฯ (ต่อยอดทีหลังได้) */}
                <div className="bg-white rounded-xl border p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            ค่าคอมมิชชั่นรวมจากทุกดีล
                        </span>
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {/* ไว้ต่อกับ table commission ทีหลัง */}
                        {formatBaht(0)}
                    </div>
                    <div className="text-xs text-slate-500">
                        รอจ่าย: ฿0 · อนุมัติแล้ว: ฿0 · จ่ายแล้ว: ฿0
                    </div>
                </div>
            </div>

            {/* ตารางสรุปรายเดือน */}
            <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-900">
                        ยอดขายรายเดือนของ {salesName}
                    </h2>
                    <span className="text-xs text-slate-500">
                        มูลค่าดีล Won และจำนวนดีลในแต่ละเดือน
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-left text-slate-500 border-b">
                                <th className="py-2 pr-4">เดือน</th>
                                <th className="py-2 pr-4">จำนวนดีล</th>
                                <th className="py-2 pr-4">มูลค่าดีล (รวม)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyDeals.map((m) => (
                                <tr key={m.key} className="border-b last:border-b-0">
                                    <td className="py-2 pr-4">{m.label}</td>
                                    <td className="py-2 pr-4">{m.deals}</td>
                                    <td className="py-2 pr-4">{formatBaht(m.amount)}</td>
                                </tr>
                            ))}

                            {monthlyDeals.length === 0 && (
                                <tr>
                                    <td
                                        className="py-3 text-center text-slate-400"
                                        colSpan={3}
                                    >
                                        ยังไม่มีข้อมูลดีลในช่วงเวลานี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ตารางดีลทั้งหมดของเซลส์คนนี้ */}
            <div className="bg-white rounded-xl border p-4">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                    รายละเอียดดีลของ {salesName}
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-left text-slate-500 border-b">
                                <th className="py-2 pr-4">รหัสดีล</th>
                                <th className="py-2 pr-4">Stage</th>
                                <th className="py-2 pr-4">มูลค่า</th>
                                <th className="py-2 pr-4">วันที่ปิดดีล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deals.map((d) => (
                                <tr key={d.id} className="border-b last:border-b-0">
                                    <td className="py-2 pr-4">{d.deal_code}</td>
                                    <td className="py-2 pr-4">{d.stage}</td>
                                    <td className="py-2 pr-4">
                                        {formatBaht(Number(d.total_amount || 0))}
                                    </td>
                                    <td className="py-2 pr-4">
                                        {d.closing_date
                                            ? new Date(d.closing_date).toLocaleDateString("th-TH")
                                            : "-"}
                                    </td>
                                </tr>
                            ))}

                            {deals.length === 0 && (
                                <tr>
                                    <td
                                        className="py-3 text-center text-slate-400"
                                        colSpan={4}
                                    >
                                        ยังไม่มีข้อมูลดีลในช่วงเวลานี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesProfile;
