// src/hooks/useTagLifecycleTotals.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type TagLifecycleTotals = {
    // Existing fields
    total_tags: number;
    in_zone_qty: number;
    available_qty: number; // NEW: "พร้อมขาย" from Tag only
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;
    cancelled_qty: number;
    // Workflow fields
    selected_for_dig_qty: number;
    root_prune_qty: number;
    ready_to_lift_qty: number;
    rehab_qty: number;
    dead_qty: number;
};

type Options = {
    zoneId?: string | null;
    speciesId?: string | null;
};

export function useTagLifecycleTotals({ zoneId = null, speciesId = null }: Options = {}) {
    const [data, setData] = useState<TagLifecycleTotals | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Use v2 RPC with SUM(qty) logic for correct tree counts
            const { data, error } = await supabase.rpc("get_tag_lifecycle_totals_v2", {
                p_zone_id: zoneId,
                p_species_id: speciesId,
            });

            if (error) throw error;

            // RPC returns 1 row
            if (data && data.length > 0) {
                setData(data[0] as TagLifecycleTotals);
            } else {
                setData({
                    total_tags: 0,
                    in_zone_qty: 0,
                    available_qty: 0,
                    reserved_qty: 0,
                    dig_ordered_qty: 0,
                    dug_qty: 0,
                    shipped_qty: 0,
                    planted_qty: 0,
                    cancelled_qty: 0,
                    // Workflow fields
                    selected_for_dig_qty: 0,
                    root_prune_qty: 0,
                    ready_to_lift_qty: 0,
                    rehab_qty: 0,
                    dead_qty: 0,
                });
            }
        } catch (e: any) {
            console.error("useTagLifecycleTotals error", e);
            setError(e?.message || "เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    }, [zoneId, speciesId]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { data, loading, error, reload };
}
