import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type ActivitySummaryRow = {
    activity_day: string;
    created_by: string;
    total_activities: number;
    total_calls: number;
    total_followups: number;
    total_meetings: number;
    customers_touched: number;
    deals_touched: number;
};

export function useMyActivitySummary(days: number = 7) {
    const [rows, setRows] = useState<ActivitySummaryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setRows([]);
                setLoading(false);
                return;
            }

            // Calculate start date
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);

            const { data, error } = await supabase
                .from("view_sales_activity_daily")
                .select("*")
                .eq("created_by", user.id)
                .gte("activity_day", fromDate.toISOString())
                .order("activity_day", { ascending: false });

            if (error) setError(error.message);
            else setRows((data || []) as ActivitySummaryRow[]);

            setLoading(false);
        };

        load();
    }, [days]);

    return { rows, loading, error };
}
