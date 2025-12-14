import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export interface ZoneTreeInventoryRow {
    zone_id: string;
    planting_plot_id: string;
    plot_tree_id: string;
    species_id: string;
    species_name_th: string | null;
    species_name_en: string | null;
    size_label: string | null;
    planted_count: number;
    dugup_done_qty: number;
    dugup_in_progress_qty: number;
    dugup_planned_qty: number;
    dead_qty: number;
    available_to_order: number;
    remaining_in_ground: number;
}

export const useZoneTreeInventoryFlow = (zoneId?: string) => {
    const [rows, setRows] = useState<ZoneTreeInventoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_zone_tree_inventory_flow")
            .select(
                `
        zone_id,
        planting_plot_id,
        plot_tree_id,
        species_id,
        species_name_th,
        species_name_en,
        size_label,
        planted_count,
        dugup_done_qty,
        dugup_in_progress_qty,
        dugup_planned_qty,
        dead_qty,
        available_to_order,
        remaining_in_ground
      `
            )
            .eq("zone_id", zoneId)
            .order("species_name_th", { ascending: true });

        if (error) {
            console.error("load zone tree inventory flow error", error);
            setError(error.message);
            setRows([]);
        } else {
            setRows((data ?? []) as ZoneTreeInventoryRow[]);
        }

        setLoading(false);
    }, [zoneId]);

    useEffect(() => {
        load();
    }, [load]);

    return { rows, loading, error, reload: load };
}
