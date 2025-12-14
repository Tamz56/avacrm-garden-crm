import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

/**
 * Type for breakdown view with height_label and grade_id
 * Grain: (zone_id, species_id, size_label, height_label, grade_id)
 */
export type TagLifecycleBreakdownRow = {
    zone_id: string;
    zone_name: string;
    farm_name: string;
    plot_type: string | null;

    species_id: string;
    species_name_th: string;
    species_name_en: string | null;
    species_code: string | null;

    size_label: string;
    height_label: string | null;
    grade_id: number | null;
    grade_name_th: string | null;
    grade_code: string | null;

    // Tag counts (no inventory in this view)
    tagged_total_qty: number;

    // Basic status
    available_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;

    // Workflow status
    selected_for_dig_qty: number;
    root_prune_qty: number;
    ready_to_lift_qty: number;
    rehab_qty: number;
    dead_qty: number;

    // Dig purpose breakdown
    dig_ordered_to_panel_qty: number;
    dig_ordered_to_customer_qty: number;
    dug_to_panel_qty: number;
    dug_to_customer_qty: number;
};

export type TagLifecycleBreakdownFilter = {
    zoneId?: string;
    speciesId?: string;
    sizeLabel?: string;
};

/**
 * Hook to fetch tag lifecycle breakdown by height/grade
 * Use this for drill-down from size-level view
 */
export function useTagLifecycleBreakdown(filter: TagLifecycleBreakdownFilter) {
    const [rows, setRows] = useState<TagLifecycleBreakdownRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!filter.zoneId && !filter.speciesId && !filter.sizeLabel) {
            setRows([]);
            return;
        }

        setLoading(true);
        setError(null);

        let query = supabase
            .from("view_tree_tag_lifecycle_breakdown")
            .select("*");

        if (filter.zoneId) {
            query = query.eq("zone_id", filter.zoneId);
        }
        if (filter.speciesId) {
            query = query.eq("species_id", filter.speciesId);
        }
        if (filter.sizeLabel) {
            query = query.eq("size_label", filter.sizeLabel);
        }

        const { data, error: err } = await query;

        if (err) {
            console.error("load tag lifecycle breakdown error", err);
            setError(err.message);
            setRows([]);
        } else {
            setRows((data || []) as TagLifecycleBreakdownRow[]);
        }

        setLoading(false);
    }, [filter.zoneId, filter.speciesId, filter.sizeLabel]);

    useEffect(() => {
        load();
    }, [load]);

    return { rows, loading, error, reload: load };
}
