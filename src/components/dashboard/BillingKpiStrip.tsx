
import React from "react";
import { useBillingDashboardSummary } from "../../hooks/useBillingDashboardSummary";
import { PREMIUM_STYLES } from "../../constants/ui";

const { SURFACE, SURFACE_HOVER, TITLE, MUTED } = PREMIUM_STYLES;

export default function BillingKpiStrip({ isDarkMode = false }: { isDarkMode?: boolean }) {
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
                <div className={`h-24 ${SURFACE}`} />
                <div className={`h-24 ${SURFACE}`} />
                <div className={`h-24 ${SURFACE}`} />
                <div className={`h-24 ${SURFACE}`} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
            <div className={`${SURFACE} ${SURFACE_HOVER} p-5 h-[110px] flex flex-col justify-between`}>
                <div className={`text-xs ${MUTED}`}>เอกสารเดือนนี้</div>
                <div className={`text-3xl font-extrabold tabular-nums ${TITLE}`}>{docCount} ใบ</div>
                <div className={`text-xs ${MUTED}`}>ใบแจ้งหนี้/ใบเสร็จ</div>
            </div>

            <div className={`${SURFACE} ${SURFACE_HOVER} p-5 h-[110px] flex flex-col justify-between`}>
                <div className={`text-xs ${MUTED}`}>ยอดรวม</div>
                <div className={`text-3xl font-extrabold tabular-nums ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>{formatMoney(total)}</div>
                <div className={`text-xs ${MUTED}`}>ยอดขายทั้งหมด</div>
            </div>

            <div className={`${SURFACE} ${SURFACE_HOVER} p-5 h-[110px] flex flex-col justify-between`}>
                <div className={`text-xs ${MUTED}`}>รับแล้ว</div>
                <div className={`text-3xl font-extrabold tabular-nums ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>{formatMoney(paid)}</div>
                <div className={`text-xs ${MUTED}`}>ชำระเรียบร้อย</div>
            </div>

            <div className={`${SURFACE} ${SURFACE_HOVER} p-5 h-[110px] flex flex-col justify-between`}>
                <div className={`text-xs ${MUTED}`}>ค้างชำระ</div>
                <div className={`text-3xl font-extrabold tabular-nums ${isDarkMode ? "text-rose-400" : "text-rose-600"}`}>{formatMoney(outstanding)}</div>
                <div className={`text-xs ${MUTED}`}>ต้องติดตาม</div>
            </div>
        </div>
    );
}
