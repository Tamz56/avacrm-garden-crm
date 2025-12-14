import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type ZoneStockVsInspectionSummaryRow = {
    zone_id: string;
    zone_name: string | null;
    farm_name: string | null;
    system_qty_total: number;
    inspected_qty_total: number;
    diff_qty_total: number;
    max_abs_diff: number;
};

export function useZoneStockVsInspectionSummary() {
    const [rows, setRows] = useState<ZoneStockVsInspectionSummaryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_zone_stock_vs_inspection_summary")
            .select("*")
            .order("farm_name", { ascending: true })
            .order("zone_name", { ascending: true });

        if (error) {
            console.error("load zone stock vs inspection summary error", error);
            setError(error.message);
        } else {
            setRows((data || []) as ZoneStockVsInspectionSummaryRow[]);
        }

        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    return { rows, loading, error, reload: load };
}
