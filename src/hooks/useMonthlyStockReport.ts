// src/hooks/useMonthlyStockReport.ts
// Updated to use snapshot-based RPC from stock_zone_monthly_snapshot table
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Type matching stock_zone_monthly_snapshot table
export type SnapshotRow = {
    id: number;
    snapshot_month: string;
    snapshot_taken_at: string;

    zone_id: string | null;
    zone_name: string | null;
    farm_name: string | null;
    plot_type: string | null;

    species_id: string | null;
    species_name_th: string | null;
    species_name_en: string | null;
    species_code: string | null;
    measure_by_height: boolean | null;

    size_label: string | null;
    height_label: string | null;
    grade_id: string | null;
    grade_name: string | null;
    grade_code: string | null;

    // quantities from snapshot
    total_qty: number;
    available_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;
    dead_qty: number;
    lost_qty: number;
};

// Aggregated row for display (grouped by species + size + grade)
export type MonthlyStockReportRow = {
    species_id: string;
    species_name_th: string | null;
    species_name_en: string | null;
    species_code: string | null;

    size_label: string;
    grade_id: string | null;
    grade_name: string | null;
    grade_code: string | null;

    // Use snapshot quantities as "end of month" values
    // Note: begin_total_qty would require comparing with previous month snapshot
    begin_total_qty: number;
    begin_available: number;

    // Movement (derived from snapshot)
    added_qty: number;
    tagged_new_qty: number;
    shipped_qty: number;
    planted_qty: number;
    dug_qty: number;

    // End of month quantities (from snapshot)
    end_total_qty: number;
    end_available: number;
    end_tagged_qty: number;
    end_untagged_qty: number;
};

export type MonthlyStockSummary = {
    begin_total: number;
    end_total: number;
    change: number;
    change_pct: number;

    end_tagged: number;
    end_untagged: number;
    tag_rate: number;

    shipped: number;
    planted: number;
    dug: number;
};

type State = {
    rows: MonthlyStockReportRow[];
    rawRows: SnapshotRow[];
    summary: MonthlyStockSummary | null;
    loading: boolean;
    error: string | null;
};

export function useMonthlyStockReport(year: number, month: number): State {
    const [rows, setRows] = useState<MonthlyStockReportRow[]>([]);
    const [rawRows, setRawRows] = useState<SnapshotRow[]>([]);
    const [summary, setSummary] = useState<MonthlyStockSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            // Format date as YYYY-MM-01 for RPC
            const monthStr = String(month).padStart(2, "0");
            const p_month = `${year}-${monthStr}-01`;

            const { data, error: rpcError } = await supabase.rpc(
                "get_stock_monthly_report",
                { p_month }
            );

            if (cancelled) return;

            if (rpcError) {
                console.error("get_stock_monthly_report error:", rpcError);
                setError(rpcError.message);
                setRows([]);
                setRawRows([]);
                setSummary(null);
            } else {
                const snapshotRows = (data ?? []) as SnapshotRow[];
                setRawRows(snapshotRows);

                // Aggregate by species + size + grade
                const aggregated = aggregateBySpeciesSizeGrade(snapshotRows);
                setRows(aggregated);

                // Calculate summary
                const endTotal = aggregated.reduce((s, r) => s + r.end_total_qty, 0);
                const endAvailable = aggregated.reduce((s, r) => s + r.end_available, 0);
                const shipped = aggregated.reduce((s, r) => s + r.shipped_qty, 0);
                const planted = aggregated.reduce((s, r) => s + r.planted_qty, 0);
                const dug = aggregated.reduce((s, r) => s + r.dug_qty, 0);

                // For now, begin_total = end_total (snapshot is point-in-time)
                // TODO: Compare with previous month snapshot for accurate begin values
                const beginTotal = endTotal;
                const change = 0;
                const changePct = 0;

                // Tagged/untagged: available = tagged, the rest is in-process
                const endTagged = endAvailable;
                const endUntagged = endTotal - endAvailable;
                const tagRate = endTotal > 0 ? (endTagged / endTotal) * 100 : 0;

                setSummary({
                    begin_total: beginTotal,
                    end_total: endTotal,
                    change,
                    change_pct: changePct,
                    end_tagged: endTagged,
                    end_untagged: endUntagged,
                    tag_rate: tagRate,
                    shipped,
                    planted,
                    dug,
                });
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [year, month]);

    return { rows, rawRows, summary, loading, error };
}

// Aggregate snapshot rows by species + size + grade
function aggregateBySpeciesSizeGrade(snapshotRows: SnapshotRow[]): MonthlyStockReportRow[] {
    const map = new Map<string, MonthlyStockReportRow>();

    for (const row of snapshotRows) {
        const key = `${row.species_id ?? "unknown"}|${row.size_label ?? ""}|${row.grade_id ?? ""}`;

        if (!map.has(key)) {
            map.set(key, {
                species_id: row.species_id ?? "unknown",
                species_name_th: row.species_name_th,
                species_name_en: row.species_name_en,
                species_code: row.species_code,
                size_label: row.size_label ?? "",
                grade_id: row.grade_id?.toString() ?? null,
                grade_name: row.grade_name,
                grade_code: row.grade_code,
                // Initialize quantities
                begin_total_qty: 0,
                begin_available: 0,
                added_qty: 0,
                tagged_new_qty: 0,
                shipped_qty: 0,
                planted_qty: 0,
                dug_qty: 0,
                end_total_qty: 0,
                end_available: 0,
                end_tagged_qty: 0,
                end_untagged_qty: 0,
            });
        }

        const agg = map.get(key)!;
        agg.end_total_qty += Number(row.total_qty ?? 0);
        agg.end_available += Number(row.available_qty ?? 0);
        agg.shipped_qty += Number(row.shipped_qty ?? 0);
        agg.planted_qty += Number(row.planted_qty ?? 0);
        agg.dug_qty += Number(row.dug_qty ?? 0);

        // Set begin values same as end (snapshot is point-in-time)
        agg.begin_total_qty = agg.end_total_qty;
        agg.begin_available = agg.end_available;

        // Tagged = available, untagged = reserved + in-process
        agg.end_tagged_qty = agg.end_available;
        agg.end_untagged_qty = agg.end_total_qty - agg.end_available;
    }

    return Array.from(map.values());
}
