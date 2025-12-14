// src/hooks/useStockLifecycleSummary.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type StockLifecycleSummary = {
    total_qty: number;         // เปลี่ยนจาก total_trees
    available_trees: number;
    reserved_trees: number;
    dig_ordered_trees: number;
    dug_trees: number;
    shipped_trees: number;
    planted_trees: number;
    approx_value: number;
};

export type StockLifecycleSummaryFilters = {
    farmName?: string;
    plotType?: string; // uuid as string
};

export function useStockLifecycleSummary(filters: StockLifecycleSummaryFilters = {}) {
    const [summary, setSummary] = useState<StockLifecycleSummary | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            const { farmName, plotType } = filters;

            const { data, error } = await supabase.rpc("get_stock_lifecycle_summary", {
                p_farm_name: farmName ?? null,
                p_plot_type: plotType ?? null,
            });

            if (cancelled) return;

            if (error) {
                console.error("get_stock_lifecycle_summary error:", error);
                setError(error.message);
                setSummary(null);
            } else if (data && data.length > 0) {
                // RPC returns array with single row
                const row = data[0];
                setSummary({
                    total_qty: row.total_qty ?? 0,
                    available_trees: row.available_trees ?? 0,
                    reserved_trees: row.reserved_trees ?? 0,
                    dig_ordered_trees: row.dig_ordered_trees ?? 0,
                    dug_trees: row.dug_trees ?? 0,
                    shipped_trees: row.shipped_trees ?? 0,
                    planted_trees: row.planted_trees ?? 0,
                    approx_value: row.approx_value ?? 0,
                });
            } else {
                setSummary({
                    total_qty: 0,
                    available_trees: 0,
                    reserved_trees: 0,
                    dig_ordered_trees: 0,
                    dug_trees: 0,
                    shipped_trees: 0,
                    planted_trees: 0,
                    approx_value: 0,
                });
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [filters.farmName, filters.plotType]);

    return { summary, loading, error };
}
