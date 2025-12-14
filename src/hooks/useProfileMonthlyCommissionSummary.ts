import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type MonthMode = "this_month"; // เผื่ออนาคตเพิ่ม last_month, custom...

type Summary = {
    profile_id: string;
    total_commission_paid: number;
    deal_count: number;
    payout_count: number;
    first_payout_date: string | null;
    last_payout_date: string | null;
};

function getMonthRange(mode: MonthMode = "this_month") {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    const toStr = (d: Date) => d.toISOString().slice(0, 10);
    return { start: toStr(start), end: toStr(end) };
}

export function useProfileMonthlyCommissionSummary(profileId?: string) {
    const [data, setData] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!profileId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            const { start, end } = getMonthRange("this_month");

            const { data, error } = await supabase.rpc(
                "get_profile_monthly_commission_summary",
                {
                    p_profile_id: profileId,
                    p_month_start: start,
                    p_month_end: end,
                }
            );

            if (error) {
                console.error("get_profile_monthly_commission_summary error", error);
                setError(error.message);
                setData(null);
            } else if (data && data.length > 0) {
                setData(data[0] as Summary);
            } else {
                setData(null);
            }

            setLoading(false);
        };

        fetchData();
    }, [profileId]);

    return { data, loading, error };
}
