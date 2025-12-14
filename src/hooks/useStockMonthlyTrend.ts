// src/hooks/useStockMonthlyTrend.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type MonthlyTrendPoint = {
    year: number;
    month: number;
    label: string; // "ธ.ค. 67", "พ.ย. 67"
    total_qty: number;
    tagged_qty: number;
    untagged_qty: number;
    available_qty: number;
};

type State = {
    data: MonthlyTrendPoint[];
    loading: boolean;
    error: string | null;
};

const THAI_MONTHS = [
    "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

export function useStockMonthlyTrend(months: number = 6): State {
    const [data, setData] = useState<MonthlyTrendPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            // Query snapshots aggregated by month
            const { data: snapshots, error: queryError } = await supabase
                .from("stock_monthly_snapshot")
                .select(`
                    snapshot_year,
                    snapshot_month,
                    inventory_qty,
                    tagged_qty,
                    untagged_qty,
                    available_qty
                `)
                .order("snapshot_year", { ascending: false })
                .order("snapshot_month", { ascending: false });

            if (cancelled) return;

            if (queryError) {
                console.error("stock_monthly_trend error:", queryError);
                setError(queryError.message);
                setData([]);
            } else {
                // Aggregate by year/month
                const aggregated = new Map<string, MonthlyTrendPoint>();

                for (const row of snapshots ?? []) {
                    const key = `${row.snapshot_year}-${row.snapshot_month}`;
                    const existing = aggregated.get(key);
                    const thaiYear = (row.snapshot_year + 543) % 100;
                    const label = `${THAI_MONTHS[row.snapshot_month]} ${thaiYear}`;

                    if (existing) {
                        existing.total_qty += Number(row.inventory_qty ?? 0);
                        existing.tagged_qty += Number(row.tagged_qty ?? 0);
                        existing.untagged_qty += Number(row.untagged_qty ?? 0);
                        existing.available_qty += Number(row.available_qty ?? 0);
                    } else {
                        aggregated.set(key, {
                            year: row.snapshot_year,
                            month: row.snapshot_month,
                            label,
                            total_qty: Number(row.inventory_qty ?? 0),
                            tagged_qty: Number(row.tagged_qty ?? 0),
                            untagged_qty: Number(row.untagged_qty ?? 0),
                            available_qty: Number(row.available_qty ?? 0),
                        });
                    }
                }

                // Sort by date descending and take last N months
                const sorted = Array.from(aggregated.values())
                    .sort((a, b) => {
                        if (a.year !== b.year) return b.year - a.year;
                        return b.month - a.month;
                    })
                    .slice(0, months)
                    .reverse(); // Oldest first for chart

                setData(sorted);
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [months]);

    return { data, loading, error };
}
