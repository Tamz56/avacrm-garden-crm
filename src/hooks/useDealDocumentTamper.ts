// src/hooks/useDealDocumentTamper.ts
// Hook for marking/unmarking deal documents as tampered via RPC

import { useState } from 'react';
import { supabase } from '../supabaseClient';

export function useDealDocumentTamper() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Mark a document as tampered
     * @param id - Document UUID
     * @param reason - Formatted reason string (use buildTamperedReason)
     */
    async function markTampered(id: string, reason: string): Promise<boolean> {
        setLoading(true);
        setError(null);

        const { error: rpcError } = await supabase.rpc('mark_deal_document_tampered_v1', {
            p_id: id,
            p_reason: reason,
        });

        setLoading(false);

        if (rpcError) {
            console.error('markTampered error:', rpcError);
            setError(rpcError.message);
            return false;
        }

        return true;
    }

    /**
     * Unmark a document as tampered (clear tamper status)
     * @param id - Document UUID
     * @param reason - Optional reason for unmark (default: CLEARED_BY_ADMIN)
     */
    async function unmarkTampered(id: string, reason?: string): Promise<boolean> {
        setLoading(true);
        setError(null);

        const { error: rpcError } = await supabase.rpc('unmark_deal_document_tampered_v1', {
            p_id: id,
            p_reason: reason ?? null,
        });

        setLoading(false);

        if (rpcError) {
            console.error('unmarkTampered error:', rpcError);
            setError(rpcError.message);
            return false;
        }

        return true;
    }

    return { loading, error, markTampered, unmarkTampered };
}
