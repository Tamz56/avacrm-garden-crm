import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { CommissionDetailRow } from "../types/commission";

function getMonthRange() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    const toStr = (d: Date) => d.toISOString().slice(0, 10);
    return { start: toStr(start), end: toStr(end) };
}

export function useProfileMonthlyCommissionDetails(profileId?: string) {
    const [rows, setRows] = useState<CommissionDetailRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!profileId) return;
        setLoading(true);
        setError(null);

        const { start, end } = getMonthRange();

        // Debug Parameters
        console.log("Calling V4 RPC with:", { pid: profileId, start_date: start, end_date: end });

        // เรียกใช้ V4 (ชื่อใหม่ + ตัวแปรใหม่)
        const { data, error } = await supabase.rpc(
            "get_commission_v4",
            {
                pid: profileId,
                start_date: start,
                end_date: end,
            }
        );

        if (error) {
            console.error("get_commission_v4 error", error);
            setError(error.message);
            setRows([]);
        } else {
            setRows((data || []) as CommissionDetailRow[]);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [profileId]);

    const refetch = async () => {
        await fetchData();
    };

    return { rows, loading, error, refetch };
}
