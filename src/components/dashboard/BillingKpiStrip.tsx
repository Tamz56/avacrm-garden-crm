
import React from "react";
import { useBillingDashboardSummary } from "../../hooks/useBillingDashboardSummary";


export default function BillingKpiStrip() {
    // Use "this_month" preset logic implicitly
    const { data, loading, error } = useBillingDashboardSummary('this_month');

    // Helper helper if utils missing
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0
        }).format(amount);
    };

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
