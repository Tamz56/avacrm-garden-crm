import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type DealActivityRow = {
    id: string;
    deal_id: string | null;
    customer_id: string | null;
    activity_type: string | null;
    channel: string | null;
    summary: string | null;
    note: string | null;
    activity_date: string;
    created_at: string;
    customer_name: string | null;
};

export function useDealActivities(dealId?: string) {
    const [rows, setRows] = useState<DealActivityRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!dealId) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from("view_deal_activities")
                .select("*")
                .eq("deal_id", dealId)
                .order("activity_date", { ascending: false });

            if (error) setError(error.message);
            else setRows((data || []) as DealActivityRow[]);
            setLoading(false);
        };
        load();
    }, [dealId]);

    return { rows, loading, error, reload: () => setRows([]) }; // Added reload stub if needed or just re-trigger
}
