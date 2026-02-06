```
import React from "react";
import { useBillingDashboardSummary } from "../../hooks/useBillingDashboardSummary";
import { formatMoney } from "../../utils/textUtils";

export default function BillingKpiStrip() {
    // Use "this_month" preset logic implicitly by passing no args or using the hook defaults
    // The user provided code uses dates. Let's stick to the hook's preset capability which defaults to '7d' but we want 'this_month' for the main dashboard usually.
    // Actually, the user snippet for Strip used manually calculated dates. 
    // Let's use the hook's preset 'this_month' for simplicity if the hook supports it.
    // Checking `useBillingDashboardSummary`: it takes initialPreset.

    const { data, loading, error } = useBillingDashboardSummary('this_month');

    // Ensure we switch to this_month if not already (though initialPreset handles it)
    // We don't need to manually calculate dates if we trust the hook's preset logic which we just wrote.

    const totals = data?.totals;
    const docCount = totals?.doc_count ?? 0;
    const total = totals?.total_amount ?? 0;
    const paid = totals?.paid_amount ?? 0;
    const outstanding = totals?.outstanding_amount ?? 0;

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                <div className="h-24 rounded-2xl bg-white/50 border border-slate-200" />
                <div className="h-24 rounded-2xl bg-white/50 border border-slate-200" />
                <div className="h-24 rounded-2xl bg-white/50 border border-slate-200" />
                <div className="h-24 rounded-2xl bg-white/50 border border-slate-200" />
            </div>
        );
    }

    if (error) {
        // Silent failure or small error text preferred for dashboard strips
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                ไม่สามารถโหลดข้อมูลการเงินได้: {error}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-100 p-4 h-[110px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs text-slate-500">เอกสารเดือนนี้</div>
                <div className="text-3xl font-extrabold tabular-nums text-slate-900">{docCount} ใบ</div>
                <div className="text-xs text-slate-400">ใบแจ้งหนี้/ใบเสร็จ</div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 p-4 h-[110px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs text-slate-500">ยอดรวม</div>
                <div className="text-3xl font-extrabold tabular-nums text-indigo-600">{formatMoney(total)}</div>
                <div className="text-xs text-slate-400">ยอดขายทั้งหมด</div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 p-4 h-[110px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs text-slate-500">รับแล้ว</div>
                <div className="text-3xl font-extrabold tabular-nums text-emerald-600">{formatMoney(paid)}</div>
                <div className="text-xs text-slate-400">ชำระเรียบร้อย</div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 p-4 h-[110px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs text-slate-500">ค้างชำระ</div>
                <div className="text-3xl font-extrabold tabular-nums text-rose-600">{formatMoney(outstanding)}</div>
                <div className="text-xs text-slate-400">ต้องติดตาม</div>
            </div>
        </div>
    );
}
