// src/hooks/useDealStockReservations.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type StockReservation = {
    id: string;
    deal_id: string;
    stock_group_id: string;
    qty: number;
    status: "reserved" | "released" | "fulfilled";
    notes: string | null;
    created_at: string;
    // Joined fields from stock_groups
    species_name_th?: string | null;
    size_label?: string | null;
    zone_key?: string | null;
};

export function useDealStockReservations(dealId?: string) {
    const [data, setData] = useState<StockReservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [reserving, setReserving] = useState(false);
    const [releasing, setReleasing] = useState<string | null>(null); // reservation id being released

    const load = useCallback(async () => {
        if (!dealId) {
            setData([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: rows, error: err } = await supabase
                .from("deal_stock_reservations")
                .select(`
                    id, deal_id, stock_group_id, qty, status, notes, created_at,
                    stock_groups ( species_name_th, size_label, zone_key )
                `)
                .eq("deal_id", dealId)
                .eq("status", "reserved")
                .order("created_at", { ascending: false });

            if (err) {
                console.error("Error loading reservations:", err);
                setError(err);
                setData([]);
                return;
            }

            const reservations: StockReservation[] = (rows || []).map((r: any) => ({
                id: r.id,
                deal_id: r.deal_id,
                stock_group_id: r.stock_group_id,
                qty: r.qty,
                status: r.status,
                notes: r.notes,
                created_at: r.created_at,
                species_name_th: r.stock_groups?.species_name_th ?? null,
                size_label: r.stock_groups?.size_label ?? null,
                zone_key: r.stock_groups?.zone_key ?? null,
            }));

            setData(reservations);
        } finally {
            setLoading(false);
        }
    }, [dealId]);

    useEffect(() => {
        load();
    }, [load]);

    // Reserve stock using reserve_stock_v1 RPC
    const reserve = async (stockGroupId: string, qty: number, notes?: string): Promise<boolean> => {
        if (!dealId) return false;

        setReserving(true);
        setError(null);

        const { error } = await supabase.rpc("reserve_stock_v1", {
            p_deal_id: dealId,
            p_stock_group_id: stockGroupId,
            p_qty: qty,
            p_notes: notes || null,
        });

        if (error) {
            console.error("Error reserving stock:", error);
            setError(error);
            setReserving(false);
            return false;
        }

        // Reload list
        await load();
        setReserving(false);
        return true;
    };

    // Release stock using release_stock_v1 RPC
    const release = async (reservationId: string, notes?: string): Promise<boolean> => {
        setReleasing(reservationId);
        setError(null);

        const { error } = await supabase.rpc("release_stock_v1", {
            p_reservation_id: reservationId,
            p_notes: notes || null,
        });

        if (error) {
            console.error("Error releasing stock:", error);
            setError(error);
            setReleasing(null);
            return false;
        }

        // Reload list
        await load();
        setReleasing(null);
        return true;
    };

    return {
        data,
        loading,
        error,
        reserving,
        releasing,
        refetch: load,
        reserve,
        release,
    };
}
