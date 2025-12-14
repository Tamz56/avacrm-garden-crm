import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type DashboardKpis = {
    ready_qty: number;
    ready_species_count: number;
    ready_zone_count: number;
    untagged_qty: number;
    untagged_zone_count: number;
    open_deals_count: number;
    open_deals_amount: number;
    active_dig_orders_count: number;
    active_dig_orders_qty: number;
};

function getDateRange(range: string) {
    const today = new Date();
    const to = today;
    const start = new Date(today);

    switch (range) {
        case "last_3m":
            start.setMonth(start.getMonth() - 3);
            break;
        case "last_6m":
            start.setMonth(start.getMonth() - 6);
            break;
        case "last_12m":
            start.setMonth(start.getMonth() - 12);
            break;
        case "this_month":
        default:
            start.setDate(1);
            break;
    }

    const fromStr = start.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    return { fromStr, toStr };
}

export function useDashboardKpis(timeRange: string) {
    const [data, setData] = useState<DashboardKpis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { fromStr, toStr } = getDateRange(timeRange);

        const { data, error } = await supabase.rpc("get_dashboard_kpis", {
            p_farm_id: null,
            p_date_from: fromStr,
            p_date_to: toStr,
        });

        if (error) {
            console.error("get_dashboard_kpis error", error);
            setError(error.message);
            setData(null);
        } else if (data && data.length > 0) {
            setData(data[0] as DashboardKpis);
        } else {
            setData(null);
        }
        setLoading(false);
    }, [timeRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

