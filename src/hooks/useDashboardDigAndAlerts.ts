import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type DashboardDigSummary = {
    month_dig_qty: number;
    month_dig_orders: number;
    upcoming_7d_qty: number;
    upcoming_7d_orders: number;
};

export type DashboardStockAlert = {
    alert_type: "low_stock" | "high_untagged" | "inspection_overdue" | string;
    zone_id: string | null;
    zone_name: string | null;
    farm_name: string | null;
    species_name_th: string | null;
    size_label: string | null;
    ready_qty: number | null;
    total_qty: number | null;
    untagged_qty: number | null;
    last_inspection_date: string | null;
    priority: number;
    message: string;
};

export function useDashboardDigAndAlerts() {
    const [summary, setSummary] = useState<DashboardDigSummary | null>(null);
    const [alerts, setAlerts] = useState<DashboardStockAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const [summaryRes, alertsRes] = await Promise.all([
            supabase
                .from("view_dashboard_dig_summary")
                .select("*")
                .maybeSingle(),
            supabase
                .from("view_dashboard_stock_alerts")
                .select("*")
                .order("priority", { ascending: true })
                .limit(3),
        ]);

        if (summaryRes.error) {
            console.error("dig summary error", summaryRes.error);
            setError(summaryRes.error.message);
        } else {
            setSummary(summaryRes.data as DashboardDigSummary | null);
        }

        if (alertsRes.error) {
            console.error("stock alerts error", alertsRes.error);
            setError((prev) => prev ?? alertsRes.error!.message);
        } else {
            setAlerts((alertsRes.data ?? []) as DashboardStockAlert[]);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { summary, alerts, loading, error, refetch: fetchData };
}

