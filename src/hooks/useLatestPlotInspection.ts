import * as React from "react";
import { supabase } from "../supabaseClient";

export type InspectionItem = {
    species_id: string;
    size_label: string | null;
    grade: string | null;
    estimated_qty: number;
};

export type LatestInspection = {
    inspection: {
        id: string;
        plot_id: string;
        inspection_date: string;
        inspector_id: string | null;
        notes: string | null;
        created_at: string;
    } | null;
    items: InspectionItem[];
};

export function useLatestPlotInspection(plotId?: string | null) {
    const [data, setData] = React.useState<LatestInspection>({ inspection: null, items: [] });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const refresh = React.useCallback(async () => {
        if (!plotId) {
            setData({ inspection: null, items: [] });
            return;
        }
        setLoading(true);
        setError(null);

        const { data: rpcData, error: rpcError } = await supabase.rpc("get_latest_plot_inspection", {
            p_plot_id: plotId,
        });

        if (rpcError) {
            console.error("useLatestPlotInspection error", rpcError);
            setError(rpcError.message);
            setData({ inspection: null, items: [] });
        } else {
            setData((rpcData ?? { inspection: null, items: [] }) as LatestInspection);
        }
        setLoading(false);
    }, [plotId]);

    React.useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, loading, error, refresh };
}
