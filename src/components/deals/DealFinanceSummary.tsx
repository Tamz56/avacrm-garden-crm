import React from "react";

type DealFinanceSummaryProps = {
    summary: {
        totalAmount: number;
        paidAmount: number;
        outstandingAmount: number;
    };
    depositInfo: {
        required: number;
        paid: number;
        status: "not_required" | "pending" | "partial" | "completed";
    };
};

export const DealFinanceSummary: React.FC<DealFinanceSummaryProps> = ({
    summary,
    depositInfo,
}) => {
    const total = summary?.totalAmount ?? 0;
    const paid = summary?.paidAmount ?? 0;
    const depositRequired = depositInfo?.required ?? 0;
    // const depositPaid = depositInfo?.paid ?? 0;

    // Remaining after deposit = Total - Deposit Required
    const remainingAfterDeposit = Math.max(total - depositRequired, 0);

    const formatMoney = (value: number) =>
        value.toLocaleString("th-TH", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });

    const percent = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 dark:border-slate-700 dark:bg-slate-800 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>💰</span> สรุปยอดการเงินดีล
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {/* Total */}
                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">มูลค่าดีล</div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-50">
                        {formatMoney(total)}
                    </div>
                </div>

                {/* Deposit */}
                <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                    <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">มัดจำที่กำหนด</div>
                    <div className="text-base font-bold text-amber-700 dark:text-amber-300">
                        {formatMoney(depositRequired)}
                    </div>
                </div>

                {/* Remaining After Deposit */}
                <div className="rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                    <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">คงเหลือหลังหักมัดจำ</div>
                    <div className="text-base font-bold text-rose-700 dark:text-rose-300">
                        {formatMoney(remainingAfterDeposit)}
                    </div>
                </div>

                {/* Paid */}
                <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">ชำระแล้ว</div>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                        {formatMoney(paid)}
                    </div>
                </div>
            </div>

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
