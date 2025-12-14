// src/hooks/useZoneStockSummary.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Type definition matching the detailed view
// Type definition matching the detailed view
export type ZoneStockSummary = {
    stock_item_id: string;
    zone_id: string;
    zone_name: string;
    location: string | null; // mapped from farm_name
    species_id: string;
    species: string;         // mapped from species_name
    size_label: string;
    trunk_size_inch: number | null;
    pot_size_inch: number | null;
    planned_trees: number;   // quantity_available + quantity_reserved
    reserved_trees: number;  // quantity_reserved
    remaining_trees: number; // quantity_available
    avg_price: number;       // base_price
    estimated_value: number; // remaining_trees * avg_price
    status: string;          // from db status
};

export function useZoneStockSummary() {
    const [data, setData] = useState<ZoneStockSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch detailed data from view_stock_overview
            const { data: rawData, error: err } = await supabase
                .from("view_stock_overview")
                .select("*")
                .order("zone_name", { ascending: true });

            if (err) {
                console.error("load view_stock_overview error", err);
                setError(err.message ?? "ไม่สามารถโหลดข้อมูลโซนได้");
                setLoading(false);
                return;
            }

            // Map to ZoneStockSummary type
            const mappedData: ZoneStockSummary[] = (rawData || []).map((r: any) => {
                const qtyAvail = r.quantity_available || 0;
                const qtyRes = r.quantity_reserved || 0;
                const price = r.base_price || 0;

                return {
                    stock_item_id: r.stock_item_id,
                    zone_id: r.zone_id,
                    zone_name: r.zone_name || "Unknown Zone",
                    location: r.farm_name || "-",
                    species_id: r.species_id,
                    species: r.species_name || "-",
                    size_label: r.size_label || "-",
                    trunk_size_inch: r.trunk_size_inch,
                    pot_size_inch: r.pot_size_inch,
                    planned_trees: qtyAvail + qtyRes,
                    reserved_trees: qtyRes,
                    remaining_trees: qtyAvail,
                    avg_price: price,
                    estimated_value: qtyAvail * price,
                    status: r.status
                };
            });

            setData(mappedData);
            setLoading(false);
        } catch (err: any) {
            console.error("load stock data error", err);
            setError(err.message ?? "ไม่สามารถโหลดข้อมูลโซนได้");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
    };
}
