import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type DigupOrderStatus = "planned" | "in_progress" | "done" | "cancelled";

export interface ZoneDigupOrderRow {
    id: string;
    zone_id: string;
    zone_name: string | null;
    digup_date: string | null;
    qty: number;
    status: DigupOrderStatus;
    notes: string | null;
    species_id: string | null;
    species_name_th: string | null;
    size_label: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export const useZoneDigupOrders = (zoneId?: string) => {
    const [rows, setRows] = useState<ZoneDigupOrderRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_zone_digup_orders")
            .select(
                `
                id,
                zone_id,
                zone_name,
                digup_date,
                qty,
                status,
                notes,
                species_id,
                species_name_th,
                size_label,
                created_at,
                updated_at
                `
            )
            .eq("zone_id", zoneId)
            .order("digup_date", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("load zone digup orders error", error);
            setError(error.message);
            setRows([]);
        } else {
            setRows((data ?? []) as ZoneDigupOrderRow[]);
        }

        setLoading(false);
    }, [zoneId]);

    useEffect(() => {
        reload();
    }, [reload]);

    const updateStatus = useCallback(
        async (orderId: string, newStatus: DigupOrderStatus) => {
            const { error } = await supabase
                .from("zone_digup_orders")
                .update({ status: newStatus })
                .eq("id", orderId);

            if (error) {
                console.error("update digup order status error", error);
                throw error;
            }

            await reload();
        },
        [reload]
    );

    return { rows, loading, error, reload, updateStatus };
};
