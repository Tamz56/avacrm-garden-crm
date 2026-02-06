// src/hooks/useDealDocumentsFinancial.ts
// Hook สำหรับ Billing Console Registry
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export type PaymentState = 'unpaid' | 'partial' | 'paid' | 'n/a';
export type DocStatus = 'issued' | 'draft' | 'cancelled' | 'voided';

export type DocRow = {
    id: string;
    deal_id: string;
    doc_type: 'QT' | 'INV' | 'DEP' | 'RCPT';
    doc_no: string;
    status: DocStatus;
    doc_date: string | null;
    customer_name: string | null;
    grand_total: number;
    paid_total: number;
    balance: number;
    payment_state: PaymentState;
    created_at: string;
    voided_at?: string | null;
    voided_by?: string | null;
    void_reason?: string | null;
    pdf_url?: string | null;
    payload?: any;  // Optional: not fetched by default
};

type Params = {
    dealId?: string;       // ถ้าไม่ส่ง = console ทั้งระบบ
    q?: string;            // search query
    docType?: string;      // filter by doc_type
    paymentState?: string; // filter by payment_state
    status?: string;       // filter by status
    month?: string;        // '2026-01' format
    limit?: number;
};

export function useDealDocumentsFinancial(params: Params) {
    const [rows, setRows] = useState<DocRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const key = useMemo(() => JSON.stringify(params), [params]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let q = supabase
                .from('view_deal_documents_financial')
                // Select specific columns to exclude heavy 'payload'
                .select('id, deal_id, doc_type, doc_no, status, doc_date, customer_name, grand_total, paid_total, balance, payment_state, created_at')
                .order('created_at', { ascending: false })
                .limit(params.limit || 200);

            // Filters
            if (params.dealId) {
                q = q.eq('deal_id', params.dealId);
            }
            if (params.docType && params.docType !== 'all') {
                q = q.eq('doc_type', params.docType);
            }
            if (params.paymentState && params.paymentState !== 'all') {
                q = q.eq('payment_state', params.paymentState);
            }
            if (params.status && params.status !== 'all') {
                q = q.eq('status', params.status);
            }

            // Month filter (YYYY-MM format) - ✅ Fixed: ไม่ใช้ Date object กัน timezone bug
            if (params.month) {
                const [y, m] = params.month.split('-').map(Number); // m = 1..12
                const start = `${y}-${String(m).padStart(2, '0')}-01`;

                // Calculate next month (exclusive end)
                const nextY = m === 12 ? y + 1 : y;
                const nextM = m === 12 ? 1 : m + 1;
                const endExclusive = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

                q = q.gte('doc_date', start).lt('doc_date', endExclusive);
            }

            // Search (doc_no OR customer_name) - ✅ Fixed: sanitize term กัน query พัง
            if (params.q?.trim()) {
                // Escape special chars that could break PostgREST filter
                const esc = (s: string) => s.replace(/[%_,()]/g, '\\$&');
                const term = esc(params.q.trim());
                q = q.or(`doc_no.ilike.%${term}%,customer_name.ilike.%${term}%`);
            }

            const { data, error: fetchError } = await q;

            if (fetchError) {
                console.error('Error fetching documents:', fetchError);
                setError(fetchError.message);
                setRows([]);
            } else {
                setRows((data as DocRow[]) ?? []);
            }
        } catch (e: any) {
            setError(e?.message || 'Unknown error');
            setRows([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    useEffect(() => {
        load();
    }, [load]);

    // Summary stats
    const stats = useMemo(() => {
        const activeRows = rows.filter(r => r.status !== 'cancelled' && r.status !== 'voided');
        return {
            totalDocs: activeRows.length,
            totalRevenue: activeRows.reduce((sum, r) => sum + (r.grand_total || 0), 0),
            totalPaid: activeRows.reduce((sum, r) => sum + (r.paid_total || 0), 0),
            totalBalance: activeRows.reduce((sum, r) => sum + (r.balance || 0), 0),
            unpaidCount: activeRows.filter(r => r.payment_state === 'unpaid').length,
            partialCount: activeRows.filter(r => r.payment_state === 'partial').length,
            paidCount: activeRows.filter(r => r.payment_state === 'paid').length,
        };
    }, [rows]);

    return { rows, loading, error, refetch: load, stats };
}
