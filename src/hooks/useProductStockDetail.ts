import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export type ProductStockDetail = {
    id: string;
    code: string;
    name: string;
    shortName: string;
    scientific_name: string | null;
    category: string | null;
    note: string | null;
    totalAvailable: number;
    zoneCount: number;
    defaultPrice: number | null;
};

export function useProductStockDetail(productId: string | null) {
    const [data, setData] = useState<ProductStockDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!productId) {
            setData(null);
            return;
        }

        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // 1. Fetch Species Details
                const { data: speciesData, error: speciesErr } = await supabase
                    .from("stock_species")
                    .select("*")
                    .eq("id", productId)
                    .single();

                if (speciesErr) throw speciesErr;

                // 2. Fetch Stock Overview for this species to calculate totals
                const { data: stockData, error: stockErr } = await supabase
                    .from("view_stock_overview")
                    .select("*")
                    .eq("species_id", productId);

                if (stockErr) throw stockErr;

                const rows = stockData || [];
                const totalAvailable = rows.reduce((sum, r) => sum + (r.quantity_available || 0), 0);
                const uniqueZones = new Set(rows.map(r => r.zone_id)).size;

                // Calculate average price
                const prices = rows.map(r => r.base_price).filter(p => p !== null) as number[];
                const defaultPrice = prices.length > 0
                    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
                    : null;

                setData({
                    id: speciesData.id,
                    code: speciesData.code,
                    name: speciesData.name,
                    shortName: speciesData.name.substring(0, 2).toUpperCase(),
                    scientific_name: speciesData.scientific_name,
                    category: speciesData.type,
                    note: speciesData.note,
                    totalAvailable,
                    zoneCount: uniqueZones,
                    defaultPrice
                });

            } catch (err: any) {
                console.error("Error fetching product detail:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [productId]);

    return { data, isLoading, error };
}
