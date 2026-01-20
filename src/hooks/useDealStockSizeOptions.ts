// src/hooks/useDealStockSizeOptions.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type DealStockSizeOption = {
    size_label: string;
    available_qty: number;
};

export function useDealStockSizeOptions() {
    const [options, setOptions] = useState<DealStockSizeOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase.rpc("get_deal_stock_sizes_v1");

            if (cancelled) return;

            if (error) {
                setError(error.message);
                setOptions([]);
            } else {
                setOptions((data ?? []) as DealStockSizeOption[]);
            }
            setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, []);

    return { options, loading, error };
}
