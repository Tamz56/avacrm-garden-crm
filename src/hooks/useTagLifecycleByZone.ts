// src/hooks/useTagLifecycleByZone.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type TagLifecycleByZoneRow = {
    zone_id: string | null;
    zone_name: string | null;
    farm_name: string | null;
    species_id: string | null;
    species_name_th: string | null;
    species_name_en: string | null;
    species_code: string | null;
    size_label: string | null;
    total_tags: number;
    in_zone_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;
    cancelled_qty: number;
};

type Options = {
    zoneId?: string | null;
    speciesId?: string | null;
};

export function useTagLifecycleByZone({ zoneId = null, speciesId = null }: Options = {}) {
    const [rows, setRows] = useState<TagLifecycleByZoneRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.rpc("get_tag_lifecycle_by_zone", {
                p_zone_id: zoneId,
                p_species_id: speciesId,
            });

            if (error) throw error;

            setRows((data || []) as TagLifecycleByZoneRow[]);
        } catch (e: any) {
            console.error("useTagLifecycleByZone error", e);
            setError(e?.message || "เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    }, [zoneId, speciesId]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { rows, loading, error, reload };
}
