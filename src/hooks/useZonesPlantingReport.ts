import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { buildZoneSummaryFromStock } from "../utils/zonePlanting";

export interface ZoneRecord {
    id: string;
    name: string;
    farm_name: string | null;
    description: string | null;

    // Area fields
    area_rai: number | null;
    area_width_m: number | null;
    area_length_m: number | null;
    planting_rows: number | null;

    // Water system
    pump_size_hp: number | null;
    water_source: string | null;

    // Inspection fields
    inspection_date: string | null;
    inspection_trunk_inch: number | null;
    inspection_height_m: number | null;
    inspection_pot_inch: number | null;
    inspection_notes: string | null;
}

interface UseZonesPlantingReportResult {
    zones: ZoneRecord[];
    zoneSummaries: Record<string, { totalPlanned: number; totalRemaining: number }>;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useZonesPlantingReport(): UseZonesPlantingReportResult {
    const [zones, setZones] = useState<ZoneRecord[]>([]);
    const [zoneSummaries, setZoneSummaries] = useState<
        Record<string, { totalPlanned: number; totalRemaining: number }>
    >({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refetch = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                // 1) โหลด zones
                const { data: zoneRows, error: zoneErr } = await supabase
                    .from("stock_zones")
                    .select(
                        `
            id,
            name,
            farm_name,
            description,
            area_rai,
            area_width_m,
            area_length_m,
            planting_rows,
            pump_size_hp,
            water_source,
            inspection_date,
            inspection_trunk_inch,
            inspection_height_m,
            inspection_pot_inch,
            inspection_notes
          `
                    )
                    .order("name", { ascending: true });

                if (zoneErr) throw zoneErr;

                // 2) โหลด stock overview เพื่อคำนวณ summary
                // Note: This summary logic might need to be updated to use planting_plot_trees in the future
                // as stock_items are now "moved out" items.
                // For now, we keep it as is, but be aware of the potential discrepancy.
                const { data: stockRows, error: stockErr } = await supabase
                    .from("view_stock_overview")
                    .select("zone_id, quantity_available, quantity_reserved");

                if (stockErr) {
                    // ถ้า stock error ก็ยังแสดง zones ได้
                    console.warn("Stock overview error:", stockErr);
                }

                const summaries = buildZoneSummaryFromStock(stockRows || []);

                if (!cancelled) {
                    setZones((zoneRows || []) as ZoneRecord[]);
                    setZoneSummaries(summaries);
                    setLoading(false);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [refreshTrigger]);

    return { zones, zoneSummaries, loading, error, refetch };
}
