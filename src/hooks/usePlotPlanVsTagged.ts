import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type PlotPlanVsTaggedRow = {
    plot_id: string;
    species_id: string;
    size_label: string | null;
    total_system: number;
    total_tagged: number;
    total_remaining: number;
    tag_pct: number;
};

export function usePlotPlanVsTagged(plotId?: string | null) {
    const [rows, setRows] = useState<PlotPlanVsTaggedRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!plotId) {
            setRows([]);
            return;
        }
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc("get_plot_plan_vs_tagged", {
            p_plot_id: plotId,
        });

        if (rpcError) {
            console.error("usePlotPlanVsTagged error", rpcError);
            setError(rpcError.message);
            setRows([]);
        } else {
            setRows((data as PlotPlanVsTaggedRow[]) ?? []);
        }
        setLoading(false);
    }, [plotId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { rows, loading, error, refresh };
}
