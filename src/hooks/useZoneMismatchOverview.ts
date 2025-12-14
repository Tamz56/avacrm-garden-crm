import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type ZoneMismatchOverview = {
    zone_id: string;
    zone_name: string | null;
    system_qty: number | null;
    inspected_qty: number | null;
    diff_qty: number | null;
    diff_abs: number | null;
    last_inspection_date: string | null;
    diff_direction: string | null;
    mismatch_status: string | null;
};

export type ZoneMismatchOverviewRow = ZoneMismatchOverview;

export function useZoneMismatchOverview() {
    const [rows, setRows] = useState<ZoneMismatchOverview[]>([]);
    const [byZoneId, setByZoneId] = useState<
        Record<string, ZoneMismatchOverview>
    >({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("view_zone_mismatch_overview")
                .select("*");

            if (cancelled) return;

            if (error) {
                console.error("load mismatch overview error", error);
                setError(error.message);
                setRows([]);
                setByZoneId({});
                setLoading(false);
                return;
            }

            const safeData = (data ?? []) as ZoneMismatchOverview[];

            setRows(safeData);

            const map: Record<string, ZoneMismatchOverview> = {};
            for (const row of safeData) {
                if (row.zone_id) {
                    map[row.zone_id] = row;
                }
            }
            setByZoneId(map);

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return { rows, byZoneId, loading, error };
}
