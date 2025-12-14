// src/components/reports/SalesReport.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Download, AlertCircle } from "lucide-react";
import { supabase } from "../../supabaseClient.ts";

// ตัวเลือกช่วงเวลา
const TIME_RANGE_OPTIONS = [
    { id: "all", label: "ทั้งหมด" },
    { id: "this_year", label: "ปีนี้" },
    { id: "last_90_days", label: "90 วันที่ผ่านมา" },
    { id: "last_30_days", label: "30 วันที่ผ่านมา" },
];

// ตัวเลือกสถานะดีล
// ใช้ stage จาก enum: inquiry, proposal, negotiation, won, lost
const STAGE_OPTIONS = [
    { id: "all", label: "ทั้งหมด" },
    { id: "won", label: "Won" },
    { id: "lost", label: "Lost" },
    { id: "open", label: "กำลังดำเนินการ" }, // ไม่ใช่ won/lost
];

const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return `฿${num.toLocaleString("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

function SalesReport() {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [timeRange, setTimeRange] = useState("all");
    const [stageFilter, setStageFilter] = useState("all");

    // === ดึงข้อมูลจาก Supabase ตาม filter ===
    useEffect(() => {
        const fetchDeals = async () => {
            setLoading(true);
            setErrorMsg("");

            try {
                let query = supabase
                    .from("deals")
                    .select(
                        "id, deal_code, title, customer_name, amount, stage, status, closing_date",
                        { count: "exact" }
                    )
                    .order("closing_date", { ascending: false });

                // ----- กรองช่วงเวลาจาก closing_date -----
                const today = new Date();
                let fromDate = null;

                if (timeRange === "this_year") {
                    fromDate = new Date(today.getFullYear(), 0, 1);
                } else if (timeRange === "last_90_days") {
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 90);
                } else if (timeRange === "last_30_days") {
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 30);
                }

                if (fromDate) {
                    const iso = fromDate.toISOString().slice(0, 10);
                    query = query.gte("closing_date", iso);
                }

                // ----- กรองสถานะดีลจาก stage -----
                if (stageFilter === "won") {
                    query = query.eq("stage", "won");
                } else if (stageFilter === "lost") {
                    query = query.eq("stage", "lost");
                } else if (stageFilter === "open") {
                    // กำลังดำเนินการ = ไม่ใช่ won / lost
                    query = query.not("stage", "in", "(won,lost)");
                }

                const { data, error } = await query;

                if (error) {
                    console.error("Error loading deals from Supabase:", error);
                    throw error;
                }

                setDeals(data || []);
            } catch (err) {
                setErrorMsg(err.message || "ไม่สามารถดึงข้อมูลจาก Supabase ได้");
            } finally {
                setLoading(false);
            }
        };

        fetchDeals();
    }, [timeRange, stageFilter]);

    // === คำนวณ summary บนการ์ดด้านบน ===
    const summary = useMemo(() => {
        // นับเฉพาะดีลที่มี amount จริง ๆ (ไม่เอาดีล mock ที่มูลค่า 0)
        const meaningfulDeals = deals.filter(
            (deal) => Number(deal.amount) > 0
        );

        // จำนวนดีลทั้งหมด (ที่มี amount)
        const totalDealsCount = meaningfulDeals.length;

        // มูลค่าดีลทั้งหมด
        const totalAmount = meaningfulDeals.reduce(
            (sum, deal) => sum + (Number(deal.amount) || 0),
            0
        );

        // ดีลที่ปิดชนะ (Won)
        const wonDeals = meaningfulDeals.filter((deal) => deal.stage === 'won');
        const wonDealsCount = wonDeals.length;
        const wonAmount = wonDeals.reduce(
            (sum, deal) => sum + (Number(deal.amount) || 0),
            0
        );

        // ดีลที่ปิดแล้ว (ใช้คำนวณ Win Rate → Won / (Won + Lost))
        const closedDeals = meaningfulDeals.filter((deal) =>
            ['won', 'lost'].includes(deal.stage)
        );
        const closedDealsCount = closedDeals.length;

        // Win Rate = Won / (Won + Lost)
        const winRate = closedDealsCount
            ? (wonDealsCount / closedDealsCount) * 100
            : 0;

        return {
            totalDealsCount,
            totalAmount,
            wonDealsCount,
            wonAmount,
            closedDealsCount,
            winRate,
        };
    }, [deals]);

    // === Export CSV ===
    const handleExportCSV = () => {
        if (!deals.length) return;

        const header = [
            "Deal ID",
            "Title",
            "Customer",
            "Amount",
            "Stage",
            "Status",
            "Closing Date",
        ];

        const rows = deals.map((d) => [
            d.deal_code || "",
            d.title || "",
            d.customer_name || "",
            Number(d.amount) || 0,
            d.stage || "",
            d.status || "",
            d.closing_date || "",
        ]);

        const escapeCell = (value) =>
            `"${String(value).replace(/"/g, '""')}"`;

        const csvContent = [
            header.map(escapeCell).join(","),
            ...rows.map((row) => row.map(escapeCell).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        const todayStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `ava_sales_report_${todayStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* หัวข้อ + Filter + ปุ่ม Export */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">
                        รายงานยอดขายดีล (Sales Report)
                    </h2>
                    <p className="text-xs text-slate-500">
                        สรุปยอดขายจากดีลที่มีในระบบ AvaCRM – แสดงจาก Supabase
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* ช่วงเวลา */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">ช่วงเวลา</span>
                        <select
                            className="border border-slate-200 rounded-lg text-xs px-2 py-1 bg-white"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            {TIME_RANGE_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* สถานะดีล */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">สถานะดีล</span>
                        <select
                            className="border border-slate-200 rounded-lg text-xs px-2 py-1 bg-white"
                            value={stageFilter}
                            onChange={(e) => setStageFilter(e.target.value)}
                        >
                            {STAGE_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ปุ่ม Export CSV */}
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* ถ้ามี error จาก Supabase */}
            {errorMsg && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                        ไม่สามารถดึงข้อมูลจาก Supabase ได้ –{" "}
                        <span className="font-medium">{errorMsg}</span>
                    </span>
                </div>
            )}

            {/* การ์ดสรุป 4 ใบ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="text-[11px] text-slate-500">จำนวนดีลทั้งหมด</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                        {summary.totalDealsCount}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="text-[11px] text-slate-500">มูลค่าดีลทั้งหมด</div>
                    <div className="mt-2 text-xl font-semibold text-emerald-600">
                        {formatCurrency(summary.totalAmount)}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="text-[11px] text-slate-500">มูลค่าดีลที่ปิดสำเร็จ (Won)</div>
                    <div className="mt-2 text-xl font-semibold text-emerald-600">
                        {formatCurrency(summary.wonAmount)}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="text-[11px] text-slate-500">Win Rate</div>
                    <div className="mt-2 text-xl font-semibold text-sky-600">
                        {summary.winRate.toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                        Won {summary.wonDealsCount} / {summary.closedDealsCount} ดีล
                    </div>
                </div>
            </div>

            {/* ตารางดีล */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="text-xs font-medium text-slate-700">
                        รายละเอียดดีล
                    </div>
                    {loading && (
                        <div className="text-[11px] text-slate-400">กำลังโหลดข้อมูล...</div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-[11px]">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="text-left px-4 py-2 font-medium">รหัสดีล</th>
                                <th className="text-left px-4 py-2 font-medium">ชื่อดีล</th>
                                <th className="text-left px-4 py-2 font-medium">ชื่อลูกค้า</th>
                                <th className="text-right px-4 py-2 font-medium">มูลค่าดีล</th>
                                <th className="text-center px-4 py-2 font-medium">สถานะ</th>
                                <th className="text-left px-4 py-2 font-medium">วันที่ปิดดีล</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {deals.map((deal) => (
                                <tr key={deal.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-slate-700">
                                        {deal.deal_code}
                                    </td>
                                    <td className="px-4 py-2 text-slate-700">
                                        {deal.title || "-"}
                                    </td>
                                    <td className="px-4 py-2 text-slate-700">
                                        {deal.customer_name || "-"}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-900">
                                        {formatCurrency(deal.amount)}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {deal.stage === "won" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                Won
                                            </span>
                                        )}
                                        {deal.stage === "lost" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                                                Lost
                                            </span>
                                        )}
                                        {deal.stage !== "won" && deal.stage !== "lost" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                                {deal.stage || "-"}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-slate-700">
                                        {formatDate(deal.closing_date)}
                                    </td>
                                </tr>
                            ))}

                            {!loading && !deals.length && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-6 text-center text-slate-400"
                                    >
                                        ยังไม่มีข้อมูลดีลสำหรับช่วงเวลานี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default SalesReport;
