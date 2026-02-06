import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient'; // ✅ Adjusted path

export type BillingDailyRow = {
    date: string; // 'YYYY-MM-DD'
    doc_count: number;
    total_amount: number;
    paid_amount: number;
    outstanding_amount: number;
};

export type BillingByTypeRow = {
    doc_type: string;
    doc_count: number;
    total_amount: number;
    paid_amount: number;
    outstanding_amount: number;
};

export type BillingDashboardSummary = {
    range: { from: string; to: string };
    totals: {
        doc_count: number;
        total_amount: number;
        paid_amount: number;
        outstanding_amount: number;
    };
    by_type: BillingByTypeRow[];
    daily: BillingDailyRow[];
};

type RangePreset = '7d' | '30d' | 'this_month' | 'custom';

function toISODate(d: Date) {
    // local -> YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function useBillingDashboardSummary(initialPreset: RangePreset = '7d') {
    const [preset, setPreset] = useState<RangePreset>(initialPreset);

    const [from, setFrom] = useState<string>(() => {
        const now = new Date();
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        return toISODate(d);
    });

    const [to, setTo] = useState<string>(() => toISODate(new Date()));

    const [data, setData] = useState<BillingDashboardSummary | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Apply preset -> from/to
    useEffect(() => {
        const now = new Date();
        if (preset === '7d') {
            const d = new Date(now);
            d.setDate(d.getDate() - 6);
            setFrom(toISODate(d));
            setTo(toISODate(now));
        } else if (preset === '30d') {
            const d = new Date(now);
            d.setDate(d.getDate() - 29);
            setFrom(toISODate(d));
            setTo(toISODate(now));
        } else if (preset === 'this_month') {
            setFrom(toISODate(startOfMonth(now)));
            setTo(toISODate(now));
        }
    }, [preset]);

    const params = useMemo(() => ({ p_from: from, p_to: to }), [from, to]);

    useEffect(() => {
        let alive = true;

        async function run() {
            setLoading(true);
            setError(null);

            const { data: rpcData, error: rpcError } = await supabase.rpc(
                'get_billing_dashboard_summary_v1',
                params
            );

            if (!alive) return;

            if (rpcError) {
                setError(rpcError.message);
                setData(null);
                setLoading(false);
                return;
            }

            // rpcData is jsonb already
            setData(rpcData as BillingDashboardSummary);
            setLoading(false);
        }

        if (from && to) run();

        return () => {
            alive = false;
        };
    }, [params, from, to]);

    return {
        preset,
        setPreset,
        from,
        to,
        setFrom,
        setTo,
        data,
        loading,
        error,
    };
}
