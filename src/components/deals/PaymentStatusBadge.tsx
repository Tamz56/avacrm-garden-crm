import React from "react";
import { useDealPaymentSummary } from "../../hooks/useDealPaymentSummary";

interface PaymentStatusBadgeProps {
    dealId: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
    dealId,
}) => {
    const { data: summary, loading } = useDealPaymentSummary(dealId);

    if (loading || !summary) {
        return (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                Checking…
            </span>
        );
    }

    // Use new field names from view_deal_payment_summary_v1
    const { net_total, paid_total, outstanding } = summary;
    const is_fully_paid = outstanding <= 0 && net_total > 0;

    let label = "Unpaid";
    let classes =
        "bg-rose-100 text-rose-700 border border-rose-200";

    if (is_fully_paid) {
        label = "Paid";
        classes =
            "bg-emerald-100 text-emerald-700 border border-emerald-200";
    } else if (paid_total > 0 && outstanding > 0) {
        label = "Partial";
        classes =
            "bg-amber-100 text-amber-700 border border-amber-200";
    }

    return (
        <div className="flex items-center gap-2">
            <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
            >
                {label}
            </span>
            {/* Tooltip logic สำหรับอธิบายวิธีคิด */}
            <div className="group relative">
                <span className="cursor-help text-xs text-slate-400">
                    i
                </span>
                <div className="pointer-events-none absolute left-1/2 z-20 hidden w-60 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-2 text-[11px] text-slate-600 shadow-md group-hover:block">
                    ยอดดีล: {net_total.toLocaleString()} บาท<br />
                    ชำระแล้ว: {paid_total.toLocaleString()} บาท<br />
                    คงเหลือ: {outstanding.toLocaleString()} บาท<br />
                    <br />
                    สถานะ:<br />
                    - Unpaid = ยังไม่ชำระ<br />
                    - Partial = ชำระบางส่วน<br />
                    - Paid = ชำระครบ (หรือเกินเล็กน้อย)
                </div>
            </div>
        </div>
    );
};

