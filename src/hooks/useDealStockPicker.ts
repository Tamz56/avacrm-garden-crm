// src/hooks/useDealStockPicker.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import type { DealStockPickerRow, DealStockPickerFilters } from "../types/stockPicker";

export function useDealStockPicker(filters: DealStockPickerFilters, open: boolean) {
    const [rows, setRows] = useState<DealStockPickerRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const payload = useMemo(() => {
        return {
            p_species_name_th: filters.species_name_th ?? null,
            p_size_label: filters.size_label ?? null,
            p_zone_key: filters.zone_key ?? null,
            p_plot_key: filters.plot_key ?? null,
            p_height_label: filters.height_label ?? null,
            p_pot_size_label: filters.pot_size_label ?? null,
            p_limit: 200,
        };
    }, [filters]);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc("search_deal_stock_picker_v1", payload);
            if (rpcError) throw rpcError;
            setRows((data ?? []) as DealStockPickerRow[]);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to load stock picker data";
            setError(message);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [payload]);

    useEffect(() => {
        if (!open) return;
        fetchRows();
    }, [open, fetchRows]);

    return { rows, loading, error, refetch: fetchRows };
}
