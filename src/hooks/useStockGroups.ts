// src/hooks/useStockGroups.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type StockGroup = {
    id: string;
    zone_key: string | null;
    plot_key: string | null;
    species_name_th: string | null;
    species_name_en?: string | null;
    size_label: string | null;
    qty_total: number;
    qty_reserved: number;
    qty_available: number;
    created_at?: string;
};

type UseStockGroupsOptions = {
    filterSpecies?: string;
    filterSize?: string;
    filterZone?: string;
};

export function useStockGroups(options: UseStockGroupsOptions = {}) {
    const [data, setData] = useState<StockGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const { filterSpecies, filterSize, filterZone } = options;

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from("stock_groups")
                .select("id, zone_key, plot_key, species_name_th, size_label, qty_total, qty_reserved, qty_available, created_at")
                .order("species_name_th", { ascending: true });

            // Apply filters if provided
            if (filterSpecies) {
                query = query.ilike("species_name_th", `%${filterSpecies}%`);
            }
            if (filterSize) {
                query = query.eq("size_label", filterSize);
            }
            if (filterZone) {
                query = query.eq("zone_key", filterZone);
            }

            const { data: rows, error: err } = await query;

            if (err) throw err;
            setData((rows as StockGroup[]) ?? []);
        } catch (e: any) {
            console.error("Error loading stock groups:", e);
            setError(e);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [filterSpecies, filterSize, filterZone]);

    useEffect(() => {
        load();
    }, [load]);

    return { data, loading, error, refetch: load };
}

// Available stock groups (qty_available > 0)
export function useAvailableStockGroups() {
    const [data, setData] = useState<StockGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: rows, error: err } = await supabase
                .from("stock_groups")
                .select("id, zone_key, plot_key, species_name_th, size_label, qty_total, qty_reserved, qty_available, created_at")
                .gt("qty_available", 0)
                .order("species_name_th", { ascending: true });

            if (err) throw err;
            setData((rows as StockGroup[]) ?? []);
        } catch (e: any) {
            console.error("Error loading available stock groups:", e);
            setError(e);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { data, loading, error, refetch: load };
}
