import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type DealStockShippedRow = {
    stock_item_id: string;
    total_shipped: number;
};

export function useDealStockShippedSummary(dealId?: string) {
    const [data, setData] = useState<DealStockShippedRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!dealId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase.rpc(
                "get_deal_stock_shipped_summary",
                { p_deal_id: dealId }
            );

            if (error) {
                console.error("get_deal_stock_shipped_summary error:", error);
                setError(error.message);
            } else {
                setData(data || []);
            }

            setLoading(false);
        };

        fetchData();
    }, [dealId]);

    return { data, loading, error };
}
