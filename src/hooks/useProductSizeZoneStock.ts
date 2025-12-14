import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export type ProductSizeZoneRow = {
    id: string;
    stock_item_id?: string; // Alias
    zone_id?: string; // Required for Modal
    size_label: string;
    zone_name: string;
    planned: number;
    reserved: number;
    remaining: number;
    quantity_available?: number; // Alias
    price_per_tree: number | null;
    base_price?: number | null; // Alias
    status: string;
    trunk_size_inch: number | null;
    pot_size_inch: number | null;
    height_text: string | null;
    ready_date: string | null;
};

export function useProductSizeZoneStock(productId: string | null, refreshTrigger: number = 0) {
    const [data, setData] = useState<{ rows: ProductSizeZoneRow[] } | null>(null);
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

                const { data: stockData, error: stockErr } = await supabase
                    .from("view_stock_overview")
                    .select("*")
                    .eq("species_id", productId);

                if (stockErr) throw stockErr;

                const rows: ProductSizeZoneRow[] = (stockData || []).map((r: any) => ({
                    id: r.stock_item_id,
                    stock_item_id: r.stock_item_id, // Alias for Modal
                    zone_id: r.zone_id, // Required for Modal
                    size_label: r.size_label || "-",
                    zone_name: r.zone_name || "-",
                    planned: (r.quantity_available || 0) + (r.quantity_reserved || 0),
                    reserved: r.quantity_reserved || 0,
                    remaining: r.quantity_available || 0,
                    quantity_available: r.quantity_available || 0, // Alias for Modal
                    price_per_tree: r.base_price,
                    base_price: r.base_price, // Alias for Modal
                    status: r.status,
                    trunk_size_inch: r.trunk_size_inch,
                    pot_size_inch: r.pot_size_inch,
                    height_text: r.height_text,
                    ready_date: r.ready_date
                }));

                // Sort by trunk_size_inch (numeric) -> pot_size_inch -> zone
                rows.sort((a, b) => {
                    const sizeA = a.trunk_size_inch ?? 0;
                    const sizeB = b.trunk_size_inch ?? 0;
                    if (sizeA !== sizeB) return sizeA - sizeB;

                    const potA = a.pot_size_inch ?? 0;
                    const potB = b.pot_size_inch ?? 0;
                    if (potA !== potB) return potA - potB;

                    return a.zone_name.localeCompare(b.zone_name, "th");
                });

                setData({ rows });

            } catch (err: any) {
                console.error("Error fetching product stock:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [productId, refreshTrigger]);

    return { data, isLoading, error };
}
