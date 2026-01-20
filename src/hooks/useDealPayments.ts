import { supabase } from "../supabaseClient";
import { DealPayment } from "../types/types";
import { useEffect, useState, useCallback } from "react";

export function useDealPayments(dealId?: string) {
    const [payments, setPayments] = useState<DealPayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!dealId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("deal_payments")
            .select("*")
            .eq("deal_id", dealId)
            .order("payment_date", { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            // map field if names don't match exactly, but based on previous checks they seem to match well enough
            // except snake_case vs camelCase.
            // DB: payment_date, payment_type, created_at
            // Type: paymentDate, paymentType, createdAt
            const rows: DealPayment[] = (data ?? []).map((row: any) => ({
                id: row.id,
                dealId: row.deal_id,
                amount: Number(row.amount ?? 0),
                paymentType: row.payment_type,
                method: row.method,
                paymentDate: row.payment_date,
                note: row.note,
                createdAt: row.created_at,
            }));
            setPayments(rows);
        }
        setLoading(false);
    }, [dealId]);

    useEffect(() => {
        load();
    }, [load]);

    return { payments, loading, error, refetch: load };
}
