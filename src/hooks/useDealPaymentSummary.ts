// src/hooks/useDealPaymentSummary.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type DealPaymentSummary = {
    deal_id: string;
    // From view_deal_payment_summary_v1
    net_total: number;
    paid_total: number;
    outstanding: number;  // >= 0, never negative
    credit: number;       // overpayment amount if any
    deposit_required_amount: number | null;
    deposit_paid: number;
    deposit_status: "not_required" | "pending" | "partial" | "completed";
};

export function useDealPaymentSummary(dealId?: string) {
    const [data, setData] = useState<DealPaymentSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const load = useCallback(async () => {
        if (!dealId) return;
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from("view_deal_payment_summary_v1")
            .select("*")
            .eq("deal_id", dealId)
            .maybeSingle();

        if (error) {
            console.error("Error loading payment summary:", error);
            setError(error);
        } else if (data) {
            const raw = data as any;
            // Ensure outstanding is never negative, credit captures overpayment
            const netTotal = raw.net_total ?? 0;
            const paidTotal = raw.paid_total ?? 0;
            const diff = netTotal - paidTotal;

            const summary: DealPaymentSummary = {
                deal_id: raw.deal_id,
                net_total: netTotal,
                paid_total: paidTotal,
                outstanding: Math.max(diff, 0),
                credit: diff < 0 ? Math.abs(diff) : 0,
                deposit_required_amount: raw.deposit_required_amount,
                deposit_paid: raw.deposit_paid ?? 0,
                deposit_status: raw.deposit_status ?? "not_required",
            };
            setData(summary);
        } else {
            setData(null);
        }
        setLoading(false);
    }, [dealId]);

    useEffect(() => {
        load();
    }, [load]);

    return { data, loading, error, refetch: load };
}
