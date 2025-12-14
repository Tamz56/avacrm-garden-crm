import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { DealCommissionRow } from "../types/commission";

export function useDealCommissionSummary(dealId?: string) {
    const [data, setData] = useState<DealCommissionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!dealId) return;

        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc(
            "get_deal_commission_summary",
            { p_deal_id: dealId }
        );

        if (error) {
            console.error("get_deal_commission_summary error", error);
            setError(error.message);
            setData([]);
        } else {
            setData((data || []) as DealCommissionRow[]);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [dealId]);

    return { data, loading, error, refetch: fetchData };
}
