import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type ZoneTreeTagRow = {
    id: string;
    tag_code: string;
    zone_id: string;
    zone_name: string | null;
    farm_name: string | null;
    species_id: string;
    species_name_th: string | null;
    species_name_en: string | null;
    size_label: string | null;
    qty: number;
    status: string;
    planting_row: number | null;
    planting_position: number | null;
    stock_item_id: string | null;
    deal_id: string | null;
    shipment_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

export function useZoneTreeTags(zoneId?: string) {
    const [rows, setRows] = useState<ZoneTreeTagRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_zone_tree_tags")
            .select("*")
            .eq("zone_id", zoneId)
            .order("species_name_th", { ascending: true })
            .order("size_label", { ascending: true })
            .order("planting_row", { ascending: true })
            .order("planting_position", { ascending: true });

        if (error) {
            console.error("load tree tags error", error);
            setError(error.message);
        } else {
            setRows((data || []) as ZoneTreeTagRow[]);
        }

        setLoading(false);
    }, [zoneId]);

    useEffect(() => {
        load();
    }, [load]);

    return { rows, loading, error, reload: load };
}
