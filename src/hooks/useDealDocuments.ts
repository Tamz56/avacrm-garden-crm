// src/hooks/useDealDocuments.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type DealDocument = {
    id: string;
    deal_id: string;
    doc_type: "DEP" | "RCPT" | "INV" | "GR";
    doc_no: string;
    payload: Record<string, any> | null;
    pdf_url: string | null;
    created_at: string;
    created_by: string | null;
};

export const DOC_TYPES = {
    DEP: { label: "ใบมัดจำ", prefix: "DEP" },
    RCPT: { label: "ใบเสร็จรับเงิน", prefix: "RCPT" },
    INV: { label: "ใบแจ้งหนี้", prefix: "INV" },
    GR: { label: "ใบรับสินค้า", prefix: "GR" },
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

        const { data, error } = await supabase
            .from("deal_documents")
            .select("*")
            .eq("deal_id", dealId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading documents:", error);
            setError(error);
        } else {
            setData(data as DealDocument[]);
        }
        setLoading(false);
    }, [dealId]);

    useEffect(() => {
        load();
    }, [load]);

    // Generate document number using next_doc_no_v1
    const getNextDocNo = async (docType: string): Promise<string | null> => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const { data, error } = await supabase.rpc("next_doc_no_v1", {
            p_doc_type: docType,
            p_doc_date: today,
        });

        if (error) {
            console.error("Error generating doc_no:", error);
            return null;
        }

        return data;
    };

    // Create document with payload snapshot
    const createDocument = async (
        docType: "DEP" | "RCPT" | "INV" | "GR",
        payload: Record<string, any>
    ): Promise<DealDocument | null> => {
        if (!dealId) return null;

        setGenerating(true);
        setError(null);

        // Step 1: Get next doc_no
        const docNo = await getNextDocNo(docType);
        if (!docNo) {
            setError({ message: "ไม่สามารถสร้างเลขเอกสารได้" });
            setGenerating(false);
            return null;
        }

        // Step 2: Insert document record (pdf_url starts as null)
        const { data, error } = await supabase
            .from("deal_documents")
            .insert({
                deal_id: dealId,
                doc_type: docType,
                doc_no: docNo,
                payload: payload,
                pdf_url: null, // PDF generated on-demand
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

    // Delete document
    const deleteDocument = async (docId: string): Promise<boolean> => {
        const { error } = await supabase
            .from("deal_documents")
            .delete()
            .eq("id", docId);

        if (error) {
            console.error("Error deleting document:", error);
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
        deleteDocument,
    };
}
