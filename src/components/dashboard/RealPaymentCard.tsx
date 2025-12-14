import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

type MonthMode = "this_month" | "last_month";

type MonthlyPaymentSummary = {
    total_payments: number;
    verified_payments: number;
    pending_payments: number;
    cancelled_payments: number;
};

function getMonthRange(mode: MonthMode) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    let startYear = year;
    let startMonth = month;

    if (mode === "last_month") {
        if (month === 0) {
            startMonth = 11;
            startYear = year - 1;
        } else {
            startMonth = month - 1;
        }
    }

    const start = new Date(startYear, startMonth, 1);
    const end = new Date(startYear, startMonth + 1, 1); // exclusive

    // Helper to format YYYY-MM-DD
    const toDateStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    return {
        start: toDateStr(start),
        end: toDateStr(end),
    };
}

export const RealPaymentCard: React.FC = () => {
    const [mode, setMode] = useState<MonthMode>("this_month");
    const [data, setData] = useState<MonthlyPaymentSummary | null>(
        null
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            const { start, end } = getMonthRange(mode);

            const { data, error } = await supabase.rpc(
                "get_monthly_payment_summary",
                {
                    p_month_start: start,
                    p_month_end: end,
                }
            );

            if (error) {
                console.error("get_monthly_payment_summary error", error);
                setData(null);
            } else if (data && data.length > 0) {
                setData(data[0] as MonthlyPaymentSummary);
            } else {
                setData(null);
            }

            setLoading(false);
        };

        fetchSummary();
    }, [mode]);

    const verified =
        data?.verified_payments ? data.verified_payments : 0;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500">
                        ยอดชำระจริง (บาท)
                    </p>
                    <p className="text-xl font-semibold">
                        {loading
                            ? "…"
                            : verified.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                            })}
                    </p>
                </div>
                <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-[10px]">
                    <button
                        onClick={() => setMode("this_month")}
                        className={`rounded-full px-2 py-0.5 ${mode === "this_month"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500"
                            }`}
                    >
                        เดือนนี้
                    </button>
                    <button
                        onClick={() => setMode("last_month")}
                        className={`rounded-full px-2 py-0.5 ${mode === "last_month"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500"
                            }`}
                    >
                        เดือนที่แล้ว
                    </button>
                </div>
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
                ตัวเลขนี้คิดจากตาราง <code>deal_payments</code> เฉพาะแถวที่
                <code>status = 'verified'</code> เท่านั้น
                ไม่รวมแถวที่รอตรวจสอบหรือยกเลิก เพื่อให้สะท้อนยอดชำระจริง
            </p>
        </div>
    );
};
