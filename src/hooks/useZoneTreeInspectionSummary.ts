import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type ZoneTreeInspectionSummaryRow = {
    zone_id: string;
    species_id: string;
    species_name_th: string | null;
    size_label: string | null;
    total_estimated_qty: number | null;
    last_inspection_date: string | null;
    grades: string | null;
};

export function useZoneTreeInspectionSummary(zoneId?: string) {
    const [rows, setRows] = useState<ZoneTreeInspectionSummaryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_zone_tree_inspection_summary")
            .select(
                `
        zone_id,
        species_id,
        species_name_th,
        size_label,
        total_estimated_qty,
        last_inspection_date,
        grades
      `
            )
            .eq("zone_id", zoneId)
            .order("species_name_th", { ascending: true })
            .order("size_label", { ascending: true });

        if (error) {
            console.error("load zone inspection summary error", error);
            setError(error.message);
            setRows([]);
        } else {
            setRows((data || []) as ZoneTreeInspectionSummaryRow[]);
        }

        setLoading(false);
    }, [zoneId]);

    useEffect(() => {
        load();
    }, [load]);

    return { rows, loading, error, reload: load };
}
