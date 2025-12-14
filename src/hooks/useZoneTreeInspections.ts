import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type ZoneTreeInspectionRow = {
    id: string;
    zone_id: string;
    species_id: string;
    species_name_th: string | null;
    size_label: string | null;
    grade: string | null;
    estimated_qty: number | null;
    inspection_date: string | null;
    notes: string | null;
};

export function useZoneTreeInspections(zoneId?: string) {
    const [rows, setRows] = useState<ZoneTreeInspectionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_zone_tree_inspections")
            .select(
                `
        id,
        zone_id,
        species_id,
        species_name_th,
        size_label,
        grade,
        estimated_qty,
        inspection_date,
        notes
      `
            )
            .eq("zone_id", zoneId)
            .order("species_name_th", { ascending: true })
            .order("size_label", { ascending: true })
            .order("grade", { ascending: true });

        if (error) {
            console.error("load zone inspections error", error);
            setError(error.message);
            setRows([]);
        } else {
            setRows((data || []) as ZoneTreeInspectionRow[]);
        }

        setLoading(false);
    }, [zoneId]);

    useEffect(() => {
        load();
    }, [load]);

    return { rows, loading, error, reload: load };
}
