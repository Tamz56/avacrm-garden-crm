import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export interface PlotTreeRow {
    plot_tree_id: string;
    plot_id: string;
    species_id: string;
    species_name_th: string;
    species_name_en: string | null;
    size_label: string;
    planted_count: number;
    dugup_qty: number;
    moved_to_stock_count: number;
    remaining_in_plot: number;
    planted_date: string | null;
    row_count: number | null;
    height_m: number | null;
    note: string | null;
}

export function usePlantingPlotDetail(plotId: string) {
    const [rows, setRows] = useState<PlotTreeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!plotId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_planting_plot_detail")
            .select("*")
            .eq("plot_id", plotId)
            .order("planted_date", { ascending: true });

        if (error) {
            setError(error.message);
        } else {
            setRows((data || []) as PlotTreeRow[]);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [plotId]);

    const totals = rows.reduce(
        (acc, r) => {
            acc.totalPlanted += r.planted_count || 0;
            acc.totalRemaining += r.remaining_in_plot || 0;
            return acc;
        },
        { totalPlanted: 0, totalRemaining: 0 }
    );

    return { rows, loading, error, totals, refetch: fetchData };
}
