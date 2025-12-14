import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type DashboardTask = {
    task_type: string;
    title: string;
    subtitle: string;
    badge: string;
    sort_order: number;
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

    return {
        fromStr: start.toISOString().slice(0, 10),
        toStr: to.toISOString().slice(0, 10),
    };
}

export function useDashboardTasks(timeRange: string) {
    const [data, setData] = useState<DashboardTask[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { fromStr, toStr } = getDateRange(timeRange);

        const { data, error } = await supabase.rpc("get_dashboard_tasks", {
            p_date_from: fromStr,
            p_date_to: toStr,
        });

        if (error) {
            console.error("get_dashboard_tasks error", error);
            setData([]);
        } else {
            setData(data || []);
        }
        setLoading(false);
    }, [timeRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, refetch: fetchData };
}

