import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { DollarSign, FileText, Users, CreditCard } from "lucide-react";
import CommissionDashboard from "../components/reports/CommissionDashboard.jsx";
import CommissionLedger from "../components/reports/CommissionLedger.jsx";
import CommissionByRoleDashboard from "../components/commissions/CommissionByRoleDashboard.jsx";



const statusConfig = {
    paid: {
        label: "จ่ายครบแล้ว",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    partial: {
        label: "ค้างจ่ายบางส่วน",
        className: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    unpaid: {
        label: "ยังไม่ได้จ่าย",
        className: "bg-rose-50 text-rose-700 border border-rose-200",
    },
};

const CommissionPayoutTab = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [summary, setSummary] = useState({
        total: 0,
        paid: 0,
        unpaid: 0,
        personCount: 0,
    });
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc("get_commission_payout_month", { p_month_str: month });

            if (error) throw error;

            const rowsData = data || [];
            setRows(rowsData);

            // Calculate summary from rows
            const total = rowsData.reduce((sum: number, r: any) => sum + (Number(r.remaining_to_pay) || 0), 0);
            const paid = rowsData.reduce((sum: number, r: any) => sum + (Number(r.total_paid) || 0), 0);

            // But let's follow the UI labels:
            // "ค่าคอมมิชชั่นที่ต้องจ่ายเดือนนี้" -> Remaining
            // "ค่าคอมมิชชั่นที่จ่ายแล้ว" -> Paid
            // "ค่าคอมมิชชั่นค้างจ่าย" -> Remaining (Same as first?)
            // Let's adjust:
            // First card: Total Commission (Paid + Unpaid)
            // Second: Paid
            // Third: Unpaid

            const totalCommission = rowsData.reduce((sum: number, r: any) => sum + (Number(r.total_commission) || 0), 0);
            const personCount = rowsData.filter((r: any) => Number(r.remaining_to_pay) > 0).length;

            setSummary({
                total: totalCommission, // Show Total Commission generated in this month
                paid: paid,
                unpaid: total, // Remaining
                personCount: personCount,
            });

        } catch (err) {
            console.error("Error fetching payout data:", err);
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMarkAsPaid = async (profileId: string) => {
        try {
            const { data, error } = await supabase.rpc("mark_commissions_as_paid", {
                p_profile_id: profileId,
            });

            if (error) throw error;

            alert(`บันทึกการจ่ายเรียบร้อย (จำนวน ${data.count} รายการ, รวม ฿${data.total_paid})`);
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error("Error paying commission:", err);
            alert("เกิดข้อผิดพลาด: " + err.message);
        }
    };


    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">
                        ค่าคอมมิชชั่นที่ต้องจ่ายเดือนนี้
                    </span>
                    <span className="text-2xl font-semibold text-slate-900">
                        ฿{summary.total.toLocaleString()}
                    </span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">
                        ค่าคอมมิชชั่นที่จ่ายแล้ว
                    </span>
                    <span className="text-2xl font-semibold text-emerald-600">
                        ฿{summary.paid.toLocaleString()}
                    </span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">
                        ค่าคอมมิชชั่นค้างจ่าย
                    </span>
                    <span className="text-2xl font-semibold text-rose-600">
                        ฿{summary.unpaid.toLocaleString()}
                    </span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">
                        จำนวน Sales ที่ต้องจ่าย
                    </span>
                    <span className="text-2xl font-semibold text-slate-900">
                        {summary.personCount} คน
                    </span>
                </div>
            </div>

            {/* Table header actions */}
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">
                    สรุปการจ่ายค่าคอมมิชชั่นตาม Sales (เดือนนี้)
                </h3>
                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                        onClick={fetchData}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-500">
                                Sales
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500">
                                บทบาท
                            </th>
                            <th className="px-4 py-2 text-right font-medium text-slate-500">
                                จำนวนดีล
                            </th>
                            <th className="px-4 py-2 text-right font-medium text-slate-500">
                                ค่าคอมฯ รวม
                            </th>
                            <th className="px-4 py-2 text-right font-medium text-slate-500">
                                จ่ายแล้ว
                            </th>
                            <th className="px-4 py-2 text-right font-medium text-slate-500">
                                ค้างจ่าย
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500">
                                วันที่จ่ายล่าสุด
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500">
                                สถานะ
                            </th>
                            <th className="px-4 py-2 text-right font-medium text-slate-500">
                                การจัดการ
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-8 text-center text-slate-400 text-sm"
                                >
                                    {loading ? "กำลังโหลดข้อมูล..." : "ยังไม่มีข้อมูลค่าคอมมิชชั่นสำหรับเดือนนี้"}
                                </td>
                            </tr>
                        )}

                        {!loading && rows.map((row: any) => {
                            // Determine status config
                            let statusKey = "unpaid";
                            if (row.status === "PAID") statusKey = "paid";
                            else if (row.status === "PARTIAL") statusKey = "partial";

                            // @ts-ignore
                            const conf = statusConfig[statusKey] ?? statusConfig.unpaid;

                            return (
                                <tr key={row.sales_profile_id} className="border-t border-slate-50">
                                    <td className="px-4 py-2 font-medium text-slate-700">{row.sales_name}</td>
                                    <td className="px-4 py-2 text-slate-500 text-xs">{row.roles}</td>
                                    <td className="px-4 py-2 text-right">
                                        {Number(row.deals_count || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        ฿{Number(row.total_commission || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-emerald-600">
                                        ฿{Number(row.total_paid || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-rose-600">
                                        ฿{Number(row.remaining_to_pay || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-slate-500 text-xs">
                                        {row.last_paid_at || "-"}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs rounded-full ${conf.className}`}
                                        >
                                            {conf.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 mr-2">
                                            ดูดีล
                                        </button>
                                        <button
                                            onClick={() => handleMarkAsPaid(row.sales_profile_id)}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                                            disabled={Number(row.remaining_to_pay) <= 0}
                                        >
                                            ทำเครื่องหมายว่าจ่ายแล้ว
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const COMMISSION_TABS = [
    { id: "summary", label: "ภาพรวมค่าคอมมิชชั่น", icon: DollarSign },
    { id: "ledger", label: "ค่าคอมจากดีล", icon: FileText },
    { id: "team", label: "ค่าคอมทีมขาย", icon: Users },
    { id: "payout", label: "สรุปจ่ายค่าคอมฯ เดือนนี้", icon: CreditCard },
];

export default function CommissionCenterPage() {
    const [activeTab, setActiveTab] = useState("summary");

    return (
        <div className="p-6 space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-8 h-8 text-emerald-600" />
                        ค่าคอมมิชชั่น
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        ศูนย์รวมรายงานค่าคอมมิชชั่นจากดีล ทีมขาย และสรุปยอดสำหรับจ่าย
                    </p>
                </div>
            </header>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-6">
                    {COMMISSION_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                group flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                                    ? "border-emerald-500 text-emerald-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                }
              `}
                        >
                            <tab.icon
                                className={`w-4 h-4 ${activeTab === tab.id
                                    ? "text-emerald-500"
                                    : "text-slate-400 group-hover:text-slate-500"
                                    }`}
                            />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === "summary" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CommissionDashboard />
                    </div>
                )}
                {activeTab === "ledger" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CommissionLedger />
                    </div>
                )}
                {activeTab === "team" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CommissionByRoleDashboard />
                    </div>
                )}
                {activeTab === "payout" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CommissionPayoutTab />
                    </div>
                )}
            </div>
        </div>
    );
}
