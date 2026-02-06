// src/hooks/useDealDocuments.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import type { DocType, DocumentPayload } from "../types/dealDocuments";

// Re-export DocType for backwards compatibility
export type { DocType };

export type DocStatus = "draft" | "issued" | "cancelled";

export type ChecksumStatus = 'unsealed' | 'verified' | 'mismatch' | null;

export type DealDocument = {
    id: string;
    deal_id: string;
    doc_type: DocType;
    doc_no: string;
    status: DocStatus;
    payload: DocumentPayload | null;  // ✅ Strongly typed payload
    payload_version?: number;
    payload_checksum?: string;
    pdf_url: string | null;
    created_at: string;
    created_by: string | null;
    // Voided/cancelled fields (from view_deal_documents_integrity)
    voided_at?: string | null;
    voided_by?: string | null;
    void_reason?: string | null;
    voided_by_name?: string | null;  // ✅ from view join
    vat_enabled?: boolean;
    // Tamper tracking fields (from view_deal_documents_integrity or fallback)
    tampered_at: string | null;
    tampered_by: string | null;
    tampered_reason: string | null;
    tampered_by_name?: string | null;  // ✅ from view join
    checksum_status: ChecksumStatus;
    expected_checksum: string | null;
    is_tampered?: boolean;
};

export const DOC_TYPES: Record<DocType, { label: string; prefix: string }> = {
    QT: { label: "ใบเสนอราคา", prefix: "QT" },
    INV: { label: "ใบแจ้งหนี้", prefix: "INV" },
    DEP: { label: "ใบมัดจำ", prefix: "DEP" },
    RCPT: { label: "ใบเสร็จรับเงิน", prefix: "RCPT" },
} as const;

export function useDealDocuments(dealId?: string) {
    const [data, setData] = useState<DealDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [generating, setGenerating] = useState(false);

    const load = useCallback(async () => {
        if (!dealId) {
            setData([]);
            return;
        }

        setLoading(true);
        setError(null);

        // Adjustment #1: Try integrity view first, fallback to raw table
        let result = await supabase
            .from("view_deal_documents_integrity")
            .select("*")
            .eq("deal_id", dealId)
            .order("created_at", { ascending: false });

        // Fallback: if view doesn't exist (42P01), query raw table
        if (result.error?.code === '42P01') {
            console.warn("view_deal_documents_integrity not found, falling back to deal_documents");
            const fallbackResult = await supabase
                .from("deal_documents")
                .select("*")
                .eq("deal_id", dealId)
                .order("created_at", { ascending: false });

            if (fallbackResult.error) {
                console.error("Error loading documents (fallback):", fallbackResult.error);
                setError(fallbackResult.error);
                setLoading(false);
                return;
            }

            // Map fallback data with default integrity values
            const mapped = (fallbackResult.data || []).map((doc: any) => ({
                ...doc,
                tampered_at: null,
                tampered_by: null,
                tampered_reason: null,
                tampered_by_name: null,  // fallback: no join available
                voided_by_name: null,    // fallback: no join available
                checksum_status: 'unsealed' as const,
                expected_checksum: null,
                is_tampered: false,
            }));
            setData(mapped as DealDocument[]);
            setLoading(false);
            return;
        }

        if (result.error) {
            console.error("Error loading documents:", result.error);
            setError(result.error);
        } else {
            setData(result.data as DealDocument[]);
        }
        setLoading(false);
    }, [dealId]);

    useEffect(() => {
        load();
    }, [load]);

    // Generate document number using next_doc_no_v1
    const getNextDocNo = async (docType: DocType, orgPrefix: string = ''): Promise<string | null> => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const { data, error } = await supabase.rpc("next_doc_no_v1", {
            p_doc_type: docType,
            p_doc_date: today,
            p_org_prefix: orgPrefix
        });

        if (error) {
            console.error("Error generating doc_no:", error);
            return null;
        }

        return data;
    };

    // Create document with payload snapshot
    const createDocument = async (
        docType: DocType,
        payload: Record<string, any>,
        vatEnabled: boolean = true,
        orgPrefix: string = ''
    ): Promise<DealDocument | null> => {
        if (!dealId) return null;

        setGenerating(true);
        setError(null);

        // Step 1: Check if custom doc_no was provided, otherwise call next_doc_no_v1
        const providedDocNo = payload.doc_no?.trim();
        let docNo: string | null;

        if (providedDocNo && providedDocNo.toUpperCase() !== 'AUTO') {
            // Use the provided doc_no
            docNo = providedDocNo;
        } else {
            // AUTO: Generate via RPC
            docNo = await getNextDocNo(docType, orgPrefix);
            if (!docNo) {
                setError({ message: "ไม่สามารถสร้างเลขเอกสารได้" });
                setGenerating(false);
                return null;
            }
        }


        // Step 2: Insert document record (pdf_url starts as null)
        const { data, error } = await supabase
            .from("deal_documents")
            .insert({
                deal_id: dealId,
                doc_type: docType,
                doc_no: docNo,
                payload: payload,
                status: 'issued',
                vat_enabled: vatEnabled,
                pdf_url: null,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating document:", error);
            setError(error);
            setGenerating(false);
            return null;
        }

        // Reload list
        await load();
        setGenerating(false);

        return data as DealDocument;
    };

    // Void document via RPC (audit fields handled server-side)
    const voidDocument = async (docId: string, reason: string): Promise<boolean> => {
        setError(null);

        const { error } = await supabase.rpc('void_deal_document_v1', {
            p_id: docId,
            p_reason: reason,
        });

        if (error) {
            console.error("Error voiding document:", error);
            setError(error);
            return false;
        }

        await load();
        return true;
    };

    return {
        data,
        loading,
        error,
        generating,
        refetch: load,
        getNextDocNo,
        createDocument,
        voidDocument,
    };
}
