// src/components/CommissionSummaryCard.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { DollarSign, Loader2, AlertCircle } from "lucide-react";

type CommissionSummaryRow = {
    profile_id: string;
    sales_name: string;
    role: string;
    month: string; // date string
    deals_count: number;
    total_base_amount: number;
    total_commission: number;
    commission_paid: number;
    commission_pending: number;
};

interface CommissionSummaryCardProps {
    profileId?: string; // ถ้าไม่ส่ง = ดูทุกคนรวมกัน
}

const CommissionSummaryCard: React.FC<CommissionSummaryCardProps> = ({
    profileId,
}) => {
    const [row, setRow] = useState<CommissionSummaryRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            let query = supabase
                .from("commission_summary_current_month_view")
                .select("*");

            if (profileId) {
                query = query.eq("profile_id", profileId);
            }

            const { data, error } = await query.limit(1);
            if (error) {
                console.error("load commission summary error", error);
                setError(error.message);
            } else {
                setRow(data && data.length > 0 ? data[0] : null);
            }
            setLoading(false);
        };

        load();
    }, [profileId]);

    const toBaht = (val: number) =>
        `฿${(val || 0).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังโหลดคอมมิชชั่น...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    เกิดข้อผิดพลาดในการโหลดคอมมิชชั่น: {error}
                </div>
            </div>
        );
    }

    if (!row) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">
                    ยังไม่มียอดคอมมิชชั่นในเดือนนี้
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase text-slate-500 font-medium">
                        คอมมิชชั่นเดือนปัจจุบัน
                    </p>
                    <p className="text-sm text-slate-700 mt-0.5">
                        {row.sales_name} ({row.role})
                    </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
            </div>

            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-slate-900">
                    {toBaht(row.total_commission)}
                </span>
                <span className="text-xs text-slate-500">ทั้งหมด</span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                    <div className="text-slate-500">ดีลที่มีสิทธิ์</div>
                    <div className="font-semibold text-slate-800">{row.deals_count} ดีล</div>
                </div>
                <div>
                    <div className="text-slate-500">จ่ายแล้ว</div>
                    <div className="font-semibold text-emerald-600">
                        {toBaht(row.commission_paid)}
                    </div>
                </div>
                <div>
                    <div className="text-slate-500">รอจ่าย</div>
                    <div className="font-semibold text-amber-600">
                        {toBaht(row.commission_pending)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommissionSummaryCard;
