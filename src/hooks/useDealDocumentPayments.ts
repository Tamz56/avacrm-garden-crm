// src/hooks/useDealDocumentPayments.ts
// Hook สำหรับจัดการ Payment ของเอกสาร
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export type DocumentPayment = {
    id: string;
    document_id: string;
    amount: number;
    method: string;
    note: string | null;
    paid_at: string;
    created_at: string;
    created_by: string | null;
};

// Hook สำหรับดู payments ของ document
export function useDealDocumentPayments(documentId?: string) {
    const [payments, setPayments] = useState<DocumentPayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!documentId) {
            setPayments([]);
            return;
        }

        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('deal_document_payments')
            .select('*')
            .eq('document_id', documentId)
            .order('paid_at', { ascending: false });

        if (fetchError) {
            setError(fetchError.message);
            setPayments([]);
        } else {
            setPayments((data as DocumentPayment[]) ?? []);
        }
        setLoading(false);
    }, [documentId]);

    useEffect(() => {
        load();
    }, [load]);

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return { payments, loading, error, refetch: load, totalPaid };
}

// Hook สำหรับ add payment
export function useAddDealDocumentPayment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addPayment = async (
        documentId: string,
        amount: number,
        method: string,
        note?: string,
        paidAt?: string
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        const { error: insertError } = await supabase
            .from('deal_document_payments')
            .insert([{
                document_id: documentId,
                amount,
                method,
                note: note || null,
                paid_at: paidAt || new Date().toISOString(),
            }]);

        setLoading(false);

        if (insertError) {
            setError(insertError.message);
            return false;
        }

        return true;
    };

    const deletePayment = async (paymentId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        const { error: deleteError } = await supabase
            .from('deal_document_payments')
            .delete()
            .eq('id', paymentId);

        setLoading(false);

        if (deleteError) {
            setError(deleteError.message);
            return false;
        }

        return true;
    };

    return { addPayment, deletePayment, loading, error };
}
