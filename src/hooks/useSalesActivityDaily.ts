import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type SalesActivityDailyRow = {
    activity_day: string;      // date (จาก view)
    created_by: string | null; // auth.user id / profile id
    total_activities: number;
    total_calls: number;
    total_followups: number;
    total_meetings: number;
    customers_touched: number;
    deals_touched: number;
};

export type SalesActivityFilter = {
    from: string;           // 'YYYY-MM-DD'
    to: string;             // 'YYYY-MM-DD'
    createdBy?: string;     // ถ้าไม่ส่ง = ทุกคน
};

export function useSalesActivityDaily(filter: SalesActivityFilter) {
    const [rows, setRows] = useState<SalesActivityDailyRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                let query = supabase
                    .from("view_sales_activity_daily")
                    .select("*")
                    .gte("activity_day", filter.from)
                    .lte("activity_day", filter.to)
                    .order("activity_day", { ascending: true });

                if (filter.createdBy) {
                    query = query.eq("created_by", filter.createdBy);
                }

                const { data, error } = await query;

                if (error) throw error;
                if (cancelled) return;

                setRows((data || []) as SalesActivityDailyRow[]);
            } catch (err: any) {
                console.error("load sales activity failed", err);
                if (!cancelled) {
                    setError(err.message || "ไม่สามารถโหลดข้อมูลกิจกรรมได้");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [filter.from, filter.to, filter.createdBy]);

    return { rows, loading, error };
}
