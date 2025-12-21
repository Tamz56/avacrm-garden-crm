import * as React from "react";
import { supabase } from "../supabaseClient";

export type PlotPTISRow = {
    species_id: string;
    size_label: string;
    grade: string | null;
    plan_qty: number;
    tagged_qty: number;
    inspected_qty: number;
    diff_inspected_vs_plan: number;
    diff_inspected_vs_tagged: number;
};

export function usePlotPlanTaggedInspectedSummary(plotId?: string | null) {
    const [rows, setRows] = React.useState<PlotPTISRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const refresh = React.useCallback(async () => {
        if (!plotId) {
            setRows([]);
            return;
        }
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc("get_plot_plan_tagged_inspected_summary", {
            p_plot_id: plotId,
        });

        if (rpcError) {
            console.error("usePlotPlanTaggedInspectedSummary error", rpcError);
            setError(rpcError.message);
            setRows([]);
        } else {
            setRows((data ?? []) as PlotPTISRow[]);
        }
        setLoading(false);
    }, [plotId]);

    React.useEffect(() => {
        refresh();
    }, [refresh]);

    return { rows, loading, error, refresh };
}
