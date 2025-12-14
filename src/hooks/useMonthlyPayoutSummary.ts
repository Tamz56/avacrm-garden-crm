// src/hooks/useMonthlyPayoutSummary.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export interface MonthlyPayoutRow {
    profile_id: string;
    full_name: string | null;
    month: string;              // date string '2025-11-01'
    due_in_month: number;
    paid_in_month: number;
    remaining_in_month: number;
}

interface UseMonthlyPayoutSummaryResult {
    data: MonthlyPayoutRow[];
    loading: boolean;
    error: string | null;
    totalDue: number;
    totalPaid: number;
    totalRemaining: number;
    refetch: () => Promise<void>;
}

/**
 * monthDateStr = 'YYYY-MM-01' เช่น '2025-11-01'
 */
export function useMonthlyPayoutSummary(
    monthDateStr: string
): UseMonthlyPayoutSummaryResult {
    const [data, setData] = useState<MonthlyPayoutRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // ถ้าไม่มีการเลือกเดือน (หรือ monthDateStr ว่าง) อาจจะไม่ fetch หรือ fetch เดือนปัจจุบัน
            // แต่ในที่นี้ assume ว่า component ส่งค่ามาถูกต้อง
            if (!monthDateStr) {
                setData([]);
                return;
            }

            const { data, error } = await supabase
                .from("v_commission_payout_summary_month")
                .select("*")
                .eq("month", monthDateStr)
                // เรียงตามชื่อ หรือจะเรียงตามยอดคงเหลือก็ได้
                .order("full_name", { ascending: true });

            if (error) {
                console.error("useMonthlyPayoutSummary error", error);
                throw error;
            }

            setData((data as MonthlyPayoutRow[]) ?? []);
        } catch (err: any) {
            setError(err.message ?? "ไม่สามารถโหลดข้อมูลสรุปค่าคอมมิชชั่นได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (monthDateStr) {
            fetchData();
        }
    }, [monthDateStr]);

    const { totalDue, totalPaid, totalRemaining } = useMemo(() => {
        const totalDue = data.reduce((sum, row) => sum + (row.due_in_month || 0), 0);
        const totalPaid = data.reduce(
            (sum, row) => sum + (row.paid_in_month || 0),
            0
        );
        const totalRemaining = data.reduce(
            (sum, row) => sum + (row.remaining_in_month || 0),
            0
        );
        return { totalDue, totalPaid, totalRemaining };
    }, [data]);

    return {
        data,
        loading,
        error,
        totalDue,
        totalPaid,
        totalRemaining,
        refetch: fetchData,
    };
}
