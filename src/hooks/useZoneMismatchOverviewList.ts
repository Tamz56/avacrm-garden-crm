import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type ZoneMismatchRow = {
    zone_id: string;
    zone_name: string;
    system_qty: number;
    inspected_qty: number | null;
    diff_qty: number | null;
    diff_abs: number | null;
    last_inspection_date: string | null;
    diff_direction: string | null;
    mismatch_status: string;
};

export function useZoneMismatchOverviewList() {
    const [rows, setRows] = useState<ZoneMismatchRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from<string, ZoneMismatchRow>("view_zone_mismatch_overview")
                .select("*")
                .order("mismatch_status", { ascending: true })
                .order("zone_name", { ascending: true });

            if (cancelled) return;

            if (error) {
                console.error("Failed to load zone mismatch overview", error);
                setError(error.message);
            } else {
                setRows(data ?? []);
            }
            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return { rows, loading, error };
}
