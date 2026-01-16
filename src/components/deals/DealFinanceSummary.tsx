import React from "react";

// New props format (from view_deal_payment_summary_v1)
type NewFormatProps = {
    netTotal: number;
    paidTotal: number;
    outstanding: number;
    credit: number;
    depositRequired?: number;
    depositPaid?: number;
    depositStatus?: "not_required" | "pending" | "partial" | "completed";
    // Legacy props should not be present
    summary?: never;
    depositInfo?: never;
};

// Legacy props format (used by DealDetailLayout)
type LegacyFormatProps = {
    summary: {
        totalAmount: number;
        paidAmount: number;
        outstandingAmount: number;
    };
    depositInfo?: {
        required: number;
        paid: number;
        status: "not_required" | "pending" | "partial" | "completed";
    };
    // New props should not be present
    netTotal?: never;
    paidTotal?: never;
    outstanding?: never;
    credit?: never;
};

type DealFinanceSummaryProps = NewFormatProps | LegacyFormatProps;

export const DealFinanceSummary: React.FC<DealFinanceSummaryProps> = (props) => {
    // Normalize both formats to internal state
    let netTotal: number;
    let paidTotal: number;
    let outstanding: number;
    let credit: number;
    let depositRequired: number;
    let depositPaid: number;
    let depositStatus: "not_required" | "pending" | "partial" | "completed";

    if ("summary" in props && props.summary) {
        // Legacy format
        netTotal = props.summary.totalAmount ?? 0;
        paidTotal = props.summary.paidAmount ?? 0;
        const diff = netTotal - paidTotal;
        outstanding = Math.max(diff, 0);
        credit = diff < 0 ? Math.abs(diff) : 0;
        depositRequired = props.depositInfo?.required ?? 0;
        depositPaid = props.depositInfo?.paid ?? 0;
        depositStatus = props.depositInfo?.status ?? "not_required";
    } else {
        // New format
        const newProps = props as NewFormatProps;
        netTotal = newProps.netTotal ?? 0;
        paidTotal = newProps.paidTotal ?? 0;
        outstanding = newProps.outstanding ?? 0;
        credit = newProps.credit ?? 0;
        depositRequired = newProps.depositRequired ?? 0;
        depositPaid = newProps.depositPaid ?? 0;
        depositStatus = newProps.depositStatus ?? "not_required";
    }

    const formatMoney = (value: number) =>
        value.toLocaleString("th-TH", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });

    const percent = netTotal > 0 ? Math.min((paidTotal / netTotal) * 100, 100) : 0;

    const depositStatusLabel = {
        not_required: "ไม่ต้องมัดจำ",
        pending: "รอชำระ",
        partial: "ชำระบางส่วน",
        completed: "ครบแล้ว",
    }[depositStatus];

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 dark:border-slate-700 dark:bg-slate-800 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>💰</span> สรุปยอดการเงินดีล
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {/* Net Total */}
                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">มูลค่าดีล</div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-50">
                        {formatMoney(netTotal)}
                    </div>
                </div>

                {/* Paid Total */}
                <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">ชำระแล้ว</div>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                        {formatMoney(paidTotal)}
                    </div>
                </div>

                {/* Outstanding (never negative) */}
                <div className="rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                    <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">ยอดคงค้าง</div>
                    <div className="text-base font-bold text-rose-700 dark:text-rose-300">
                        {formatMoney(outstanding)}
                    </div>
                </div>

                {/* Credit (show only if > 0) */}
                {credit > 0 && (
                    <div className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                        <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">เครดิต (ชำระเกิน)</div>
                        <div className="text-base font-bold text-blue-700 dark:text-blue-300">
                            {formatMoney(credit)}
                        </div>
                    </div>
                )}

                {/* Deposit Info */}
                {depositStatus !== "not_required" && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                        <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            มัดจำ: {depositStatusLabel}
                        </div>
                        <div className="text-base font-bold text-amber-700 dark:text-amber-300">
                            {formatMoney(depositPaid)} / {formatMoney(depositRequired)}
                        </div>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span>ความคืบหน้าการชำระเงิน</span>
                    <span>{Math.round(percent)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

