import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type ActiveStockPrice = {
    id: string;
    species_id: string;
    size_label: string;
    grade: string | null;
    base_price: number;
    currency: string;
    valid_from: string | null;
    valid_to: string | null;
};

export function useActiveStockPriceMap() {
    const [prices, setPrices] = useState<ActiveStockPrice[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_stock_active_price")
            .select("*");

        if (error) {
            console.error("load active prices error", error);
            setError(error.message);
            setPrices([]);
        } else {
            setPrices((data || []) as ActiveStockPrice[]);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // map key: species_id + size_label (ตอนนี้ยังไม่แยกตาม grade)
    const priceMap = useMemo(() => {
        const map = new Map<string, ActiveStockPrice>();
        for (const p of prices) {
            const key = `${p.species_id}__${p.size_label}`; // ถ้าอยากแยก grade ค่อยเปลี่ยน
            if (!map.has(key)) {
                map.set(key, p);
            }
        }
        return map;
    }, [prices]);

    return { prices, priceMap, loading, error, reload: load };
}
