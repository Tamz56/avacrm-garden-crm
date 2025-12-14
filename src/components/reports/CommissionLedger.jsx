// src/components/reports/CommissionLedger.jsx

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient.ts";
import {
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    Filter,
} from "lucide-react";

const TIME_RANGE_OPTIONS = [
    { id: "all", label: "ทั้งหมด" },
    { id: "this_year", label: "ปีนี้" },
    { id: "last_90_days", label: "90 วันที่ผ่านมา" },
    { id: "last_30_days", label: "30 วันที่ผ่านมา" },
];

// Helper function for date formatting (Local Time)
const formatDateForSupabase = (date) => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const CommissionLedger = () => {
    const [timeRange, setTimeRange] = useState("this_year");
    const [commissions, setCommissions] = useState([]);
    const [deals, setDeals] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- คำนวณช่วงเวลา ---
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

    // --- โหลดข้อมูล commissions + deals + profiles ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [{ data: commRows, error: commErr }, { data: dealRows, error: dealErr }, { data: profileRows, error: profileErr }] =
                    await Promise.all([
                        supabase.from("deal_commissions").select("*"),
                        supabase.from("deals").select("id, deal_code, closing_date, stage"),
                        supabase.from("profiles").select("id, full_name"),
                    ]);

                if (commErr) throw commErr;
                if (dealErr) throw dealErr;
                if (profileErr) throw profileErr;

                setCommissions(commRows || []);
                setDeals(dealRows || []);
                setProfiles(profileRows || []);
            } catch (err) {
                console.error("Commission ledger fetch error:", err);
                setError("โหลดข้อมูลค่าคอมมิชชั่นไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatBaht = (val) =>
        `฿${(val || 0).toLocaleString("th-TH", {
            maximumFractionDigits: 0,
        })}`;

    const formatPercent = (val) =>
        `${(val || 0).toLocaleString("th-TH", {
            maximumFractionDigits: 1,
        })}%`;

    // --- คำนวณ summary + ตาราง ---
    const {
        filteredRows,
        perSales,
        totalCommission,
        paidCommission,
        unpaidCommission,
    } = useMemo(() => {
        if (!commissions.length) {
            return {
                filteredRows: [],
                perSales: [],
                totalCommission: 0,
                paidCommission: 0,
                unpaidCommission: 0,
            };
        }

        const dealMap = new Map();
        for (const d of deals) {
            dealMap.set(d.id, d);
        }

        const profileMap = new Map();
        for (const p of profiles) {
            profileMap.set(p.id, p);
        }

        // filter by timeRange (อิง closing_date ของดีล)
        const rows = commissions
            .map((c) => {
                const deal = dealMap.get(c.deal_id);
                const profile = profileMap.get(c.sales_id);
                return {
                    ...c,
                    deal,
                    salesName: profile?.full_name || c.sales_id,
                };
            })
            .filter((row) => {
                const closing = row.deal?.closing_date;
                if (!closing) return false; // ไม่มีวันที่ปิดดีล ก็ไม่ต้องนับ

                if (!fromDate) return true;
                return closing >= fromDate && closing <= toDate;
            });

        let totalCommission = 0;
        let paidCommission = 0;
        let unpaidCommission = 0;

        const perSalesMap = new Map();

        for (const r of rows) {
            const key = r.sales_id;
            const amount = Number(r.commission_amount || 0);

            totalCommission += amount;

            if (r.status === "paid") {
                paidCommission += amount;
            } else if (["pending", "approved"].includes(r.status)) {
                unpaidCommission += amount;
            }

            if (!perSalesMap.has(key)) {
                perSalesMap.set(key, {
                    salesId: key,
                    salesName: r.salesName,
                    dealsCount: 0,
                    totalBase: 0,
                    totalCommission: 0,
                    paidCommission: 0,
                    unpaidCommission: 0,
                });
            }

            const s = perSalesMap.get(key);
            s.dealsCount += 1;
            s.totalBase += Number(r.base_amount || 0);
            s.totalCommission += amount;

            if (r.status === "paid") {
                s.paidCommission += amount;
            } else if (["pending", "approved"].includes(r.status)) {
                s.unpaidCommission += amount;
            }
        }

        const perSales = Array.from(perSalesMap.values()).sort(
            (a, b) => b.totalCommission - a.totalCommission
        );

        return {
            filteredRows: rows,
            perSales,
            totalCommission,
            paidCommission,
            unpaidCommission,
        };
    }, [commissions, deals, profiles, fromDate, toDate]);

    // --- UI state ---
    if (loading) {
        return (
            <div className="p-6">
                <p className="text-sm text-slate-500">กำลังโหลดรายงานค่าคอมมิชชั่น...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <p className="text-sm text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header + Filters */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Commission Ledger – ค่าคอมมิชชั่นจากดีล
                    </h1>
                    <p className="text-sm text-slate-500">
                        สรุปค่าคอมมิชชั่นตาม Sales และรายการดีลที่มีค่าคอมมิชชั่นในช่วงเวลาที่เลือก
                    </p>
                </div>

                <div className="flex items-center gap-3">
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
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            ค่าคอมมิชชั่นรวมทั้งหมด
                        </span>
                        <DollarSign size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {formatBaht(totalCommission)}
                    </div>
                </div>

                <div className="bg-white rounded-xl border p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            ค่าคอมมิชชั่นที่จ่ายแล้ว
                        </span>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {formatBaht(paidCommission)}
                    </div>
                </div>

                <div className="bg-white rounded-xl border p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            ค่าคอมมิชชั่นค้างจ่าย (pending/approved)
                        </span>
                        <Clock size={16} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {formatBaht(unpaidCommission)}
                    </div>
                </div>
            </div>

            {/* per Sales summary */}
            <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-900">
                        สรุปค่าคอมมิชชั่นตาม Sales
                    </h2>
                    <span className="text-xs text-slate-500">
                        ยอดรวมฐานดีลและค่าคอมมิชชั่นในช่วงเวลาที่เลือก
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-left text-slate-500 border-b">
                                <th className="py-2 pr-4">Sales</th>
                                <th className="py-2 pr-4">จำนวนดีล</th>
                                <th className="py-2 pr-4">ยอดฐานดีลรวม</th>
                                <th className="py-2 pr-4">ค่าคอมฯ รวม</th>
                                <th className="py-2 pr-4">จ่ายแล้ว</th>
                                <th className="py-2 pr-4">ค้างจ่าย</th>
                            </tr>
                        </thead>
                        <tbody>
                            {perSales.map((s) => (
                                <tr key={s.salesId} className="border-b last:border-b-0">
                                    <td className="py-2 pr-4">{s.salesName}</td>
                                    <td className="py-2 pr-4">{s.dealsCount}</td>
                                    <td className="py-2 pr-4">{formatBaht(s.totalBase)}</td>
                                    <td className="py-2 pr-4">{formatBaht(s.totalCommission)}</td>
                                    <td className="py-2 pr-4">{formatBaht(s.paidCommission)}</td>
                                    <td className="py-2 pr-4">
                                        {formatBaht(s.unpaidCommission)}
                                    </td>
                                </tr>
                            ))}

                            {perSales.length === 0 && (
                                <tr>
                                    <td
                                        className="py-3 text-center text-slate-400"
                                        colSpan={6}
                                    >
                                        ยังไม่มีค่าคอมมิชชั่นในช่วงเวลาที่เลือก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ledger table */}
            <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-900">
                        รายการค่าคอมมิชชั่น (Commission Ledger)
                    </h2>
                    <span className="text-xs text-slate-500">
                        แสดงทีละดีล พร้อมสถานะค่าคอมมิชชั่น
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-left text-slate-500 border-b">
                                <th className="py-2 pr-4">วันที่ปิดดีล</th>
                                <th className="py-2 pr-4">รหัสดีล</th>
                                <th className="py-2 pr-4">Sales</th>
                                <th className="py-2 pr-4">ยอดฐานดีล</th>
                                <th className="py-2 pr-4">% คอมมิชชั่น</th>
                                <th className="py-2 pr-4">ค่าคอมฯ</th>
                                <th className="py-2 pr-4">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((r) => (
                                <tr key={r.id} className="border-b last:border-b-0">
                                    <td className="py-2 pr-4">
                                        {r.deal?.closing_date
                                            ? new Date(r.deal.closing_date).toLocaleDateString(
                                                "th-TH"
                                            )
                                            : "-"}
                                    </td>
                                    <td className="py-2 pr-4">
                                        {r.deal?.deal_code || r.deal_id}
                                    </td>
                                    <td className="py-2 pr-4">{r.salesName}</td>
                                    <td className="py-2 pr-4">{formatBaht(r.base_amount)}</td>
                                    <td className="py-2 pr-4">
                                        {formatPercent(r.commission_rate)}
                                    </td>
                                    <td className="py-2 pr-4">
                                        {formatBaht(r.commission_amount)}
                                    </td>
                                    <td className="py-2 pr-4">
                                        <span
                                            className={
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] " +
                                                (r.status === "paid"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : r.status === "pending"
                                                        ? "bg-amber-50 text-amber-700"
                                                        : r.status === "approved"
                                                            ? "bg-sky-50 text-sky-700"
                                                            : "bg-slate-50 text-slate-500")
                                            }
                                        >
                                            {["pending", "approved"].includes(r.status) && (
                                                <AlertCircle size={12} />
                                            )}
                                            {r.status === "paid" && <CheckCircle2 size={12} />}
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {filteredRows.length === 0 && (
                                <tr>
                                    <td
                                        className="py-3 text-center text-slate-400"
                                        colSpan={7}
                                    >
                                        ยังไม่มีค่าคอมมิชชั่นในช่วงเวลาที่เลือก
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

export default CommissionLedger;
