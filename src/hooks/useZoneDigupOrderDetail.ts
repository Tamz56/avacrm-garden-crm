import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export type ZoneDigupOrderDetailRow = {
    zone_digup_order_id: string;
    zone_id: string | null;
    zone_name: string | null;

    digup_date: string | null;
    order_status: string | null;
    order_qty: number | null;
    order_notes: string | null;
    order_created_at: string | null;
    order_updated_at: string | null;
    order_created_by: string | null;

    source_plan_id: string | null;
    order_species_id: string | null;
    order_size_label: string | null;
    order_species_name_th: string | null;
    order_species_name_en: string | null;

    item_id: string;
    tag_id: string;
    item_qty: number | null;
    item_notes: string | null;
    item_created_at: string | null;
    item_created_by: string | null;

    tag_code: string | null;
    tag_size_label: string | null;
    planting_row: string | number | null;
    planting_position: string | number | null;
    tag_notes: string | null;

    tag_status: string | null;
    tag_grade: string | null;

    tag_species_name_th: string | null;
    tag_species_name_en: string | null;
    tag_zone_name: string | null;
};

export function useZoneDigupOrderDetail(zoneDigupOrderId?: string) {
    const [rows, setRows] = useState<ZoneDigupOrderDetailRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let alive = true;

        async function load() {
            if (!zoneDigupOrderId) {
                setRows(null);
                setError(null);
                return;
            }

            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("view_zone_digup_order_detail_v1")
                .select("*")
                .eq("zone_digup_order_id", zoneDigupOrderId)
                .order("tag_code", { ascending: true });

            if (!alive) return;

            if (error) {
                setError(error.message);
                setRows(null);
            } else {
                setRows((data ?? []) as ZoneDigupOrderDetailRow[]);
            }

            setLoading(false);
        }

        load();
        return () => {
            alive = false;
        };
    }, [zoneDigupOrderId]);

    // header summary (ใช้งานง่ายใน UI)
    const header = useMemo(() => {
        const r = rows?.[0];
        if (!r) return null;
        return {
            zone_digup_order_id: r.zone_digup_order_id,
            zone_name: r.zone_name,
            digup_date: r.digup_date,
            order_status: r.order_status,
            order_qty: r.order_qty,
            order_species_name_th: r.order_species_name_th ?? r.tag_species_name_th,
            order_size_label: r.order_size_label ?? r.tag_size_label,
            source_plan_id: r.source_plan_id,
        };
    }, [rows]);

    return { rows, header, loading, error };
}
