// src/hooks/useDealPaymentSummary.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type DealPaymentSummary = {
    deal_id: string;
    deal_amount: number;
    deposit_required_amount: number | null;
    total_paid: number;
    deposit_paid: number;
    non_deposit_paid: number;
    deposit_status: "not_required" | "pending" | "partial" | "completed";
    remaining_amount: number;
};

export function useDealPaymentSummary(dealId?: string) {
    const [data, setData] = useState<DealPaymentSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const load = async () => {
        if (!dealId) return;
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from("view_deal_payment_summary")
            .select("*")
            .eq("deal_id", dealId)
            .maybeSingle();

        if (error) {
            console.error("Error loading payment summary:", error);
            setError(error);
        } else {
            const summary = data as any;
            if (summary) {
                // Calculate remaining amount if not provided
                summary.remaining_amount = summary.deal_amount - summary.total_paid;
            }
            setData(summary);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [dealId]);

    return { data, loading, error, refetch: load };
}
