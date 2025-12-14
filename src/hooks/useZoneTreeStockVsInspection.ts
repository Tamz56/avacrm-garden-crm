import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type ZoneTreeStockVsInspectionRow = {
    zone_id: string;
    species_id: string;
    species_name_th?: string; // Added from view update
    size_label: string | null;
    system_qty: number;
    inspected_qty: number;
    diff_qty: number;
    last_inspection_date: string | null;
};

export function useZoneTreeStockVsInspection(zoneId?: string) {
    const [rows, setRows] = useState<ZoneTreeStockVsInspectionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_zone_tree_stock_vs_inspection")
            .select("*")
            .eq("zone_id", zoneId)
            .order("species_name_th", { ascending: true })
            .order("size_label", { ascending: true });

        if (error) {
            console.error("load stock vs inspection error", error);
            setError(error.message);
        } else {
            setRows((data || []) as ZoneTreeStockVsInspectionRow[]);
        }

        setLoading(false);
    }, [zoneId]);

    useEffect(() => {
        load();
    }, [load]);

    return { rows, loading, error, reload: load };
}
