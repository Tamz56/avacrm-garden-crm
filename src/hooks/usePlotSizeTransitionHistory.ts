import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type PlotSizeTransitionReason =
    | "growth"
    | "sale"
    | "loss"
    | "correction"
    | "transfer";

export interface PlotSizeTransitionRow {
    id: string;
    plot_id: string;
    species_id: string;
    from_size_label: string;
    to_size_label: string;
    qty: number;
    effective_date: string | null;
    reason: PlotSizeTransitionReason;
    note: string | null;
    created_at: string;
    created_by: string | null;
    // client-side enrich:
    species_name_th?: string;
}

export function usePlotSizeTransitionHistory(plotId?: string) {
    const [rows, setRows] = useState<PlotSizeTransitionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRows = useCallback(
        async (id: string) => {
            setLoading(true);
            setError(null);

            try {
                // 1) movements
                const { data, error } = await supabase
                    .from("planting_plot_tree_movements")
                    .select(
                        "id, plot_id, species_id, from_size_label, to_size_label, qty, effective_date, reason, note, created_at, created_by"
                    )
                    .eq("plot_id", id)
                    .order("effective_date", { ascending: false, nullsFirst: false })
                    .order("created_at", { ascending: false })
                    .limit(200);

                if (error) throw error;

                const items = (data ?? []) as PlotSizeTransitionRow[];

                // 2) enrich species names (avoid reliance on FK relationship config)
                const speciesIds = Array.from(
                    new Set(items.map((x) => x.species_id).filter(Boolean))
                );

                let speciesMap = new Map<string, string>();
                if (speciesIds.length > 0) {
                    const { data: spData, error: spErr } = await supabase
                        .from("stock_species")
                        .select("id, name_th, name")
                        .in("id", speciesIds);

                    if (spErr) throw spErr;

                    (spData ?? []).forEach((s: any) => {
                        speciesMap.set(s.id, s.name_th || s.name || s.id);
                    });
                }

                const enriched = items.map((r) => ({
                    ...r,
                    species_name_th: speciesMap.get(r.species_id) || r.species_id,
                }));

                setRows(enriched);
                return enriched;
            } catch (e: any) {
                console.error("fetch planting_plot_tree_movements error", e);
                setError(e.message || "Unknown error");
                setRows([]);
                return [];
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const reload = useCallback(async () => {
        if (!plotId) return;
        await fetchRows(plotId);
    }, [plotId, fetchRows]);

    useEffect(() => {
        if (plotId) reload();
    }, [plotId, reload]);

    return { rows, loading, error, reload, fetchRows };
}
