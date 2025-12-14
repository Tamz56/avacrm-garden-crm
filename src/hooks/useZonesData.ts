import * as React from "react";
import { supabase } from "../supabaseClient";

export type ZoneOverviewRow = {
    id: string;
    name: string;
    farm_name: string | null;
    area_rai: number | null;
    area_width_m: number | null;
    area_length_m: number | null;
    description: string | null;
    plot_type: string | null;
    plot_type_name: string | null;
    planting_rows: number | null;
    pump_size_hp: number | null;
    water_source: string | null;
    inspection_date: string | null;
    inspection_trunk_inch: number | null;
    inspection_height_m: number | null;
    inspection_pot_inch: number | null;
    inspection_notes: string | null;
    created_at: string | null;

    total_planted_qty: number;
    total_planted_plan: number;
    total_digup_qty: number;
    total_remaining_qty: number;

    // New status fields
    total_digup_done_qty: number;
    total_digup_in_progress_qty: number;
    total_digup_planned_qty: number;
    total_dead_qty: number;
};

export const useZonesData = () => {
    const [zones, setZones] = React.useState<ZoneOverviewRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const reload = React.useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("view_zone_overview")
            .select(
                `
        id,
        name,
        farm_name,
        area_rai,
        area_width_m,
        area_length_m,
        description,
        plot_type,
        plot_type_name,
        planting_rows,
        pump_size_hp,
        water_source,
        inspection_date,
        inspection_trunk_inch,
        inspection_height_m,
        inspection_pot_inch,
        inspection_notes,
        created_at,
        total_planted_qty,
        total_planted_plan,
        total_digup_qty,
        total_remaining_qty,
        total_digup_done_qty,
        total_digup_in_progress_qty,
        total_digup_planned_qty,
        total_dead_qty
      `
            )
            .order("name", { ascending: true });

        if (error) {
            console.error("load zones error", error);
            setError(error.message);
            setZones([]);
        } else {
            setZones((data ?? []) as ZoneOverviewRow[]);
        }

        setLoading(false);
    }, []);

    React.useEffect(() => {
        reload();
    }, [reload]);

    const summary = React.useMemo(() => {
        const totalZones = zones.length;

        const totalPlanned = zones.reduce(
            (sum, z) => sum + (z.total_planted_qty || 0),
            0
        );

        const totalDigup = zones.reduce(
            (sum, z) => sum + (z.total_digup_qty || 0),
            0
        );

        const totalRemaining = zones.reduce(
            (sum, z) => sum + (z.total_remaining_qty || 0),
            0
        );

        const totalArea = zones.reduce((sum, z) => sum + (z.area_rai || 0), 0);

        return {
            totalZones,
            totalPlanned,
            totalDigup,
            totalRemaining,
            totalArea,
        };
    }, [zones]);

    return { zones, loading, error, reload, summary };
};
