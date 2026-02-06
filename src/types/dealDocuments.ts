// src/types/dealDocuments.ts
// Single Source of Truth for Document Payload / Totals Contract

export type DocType = "QT" | "INV" | "DEP" | "RCPT";

export type DocumentItem = {
    id: string | number;
    ref_id?: string;
    description: string;
    subText?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    amount: number;
    is_shipping?: boolean; // ✅ Flag for shipping items
};

export type DocumentTotals = {
    subTotal: number;     // "รวมรายการต้นไม้" (itemsTotal)
    discount: number;
    vatBase: number;
    vatRate: number;
    vatAmount: number;
    grandTotal: number;
    bahtText: string;
};

export type DocumentPayload = {
    doc_no: string;
    doc_date: string;
    doc_type: DocType;
    company: {
        name: string;
        address: string;
        phone: string;
        tax_id?: string;
        branch?: string;
        logo_url?: string;
    };
    customer: {
        name: string;
        address: string;
        phone: string;
        tax_id?: string;
        branch?: string;
    };
    items: DocumentItem[];
    totals: DocumentTotals;

    toggles?: { vat_enabled?: boolean };

    shipping?: {
        fee: number;
        vehicle: "pickup" | "truck6" | "truck10" | "other";
        note?: string;
    };

    discount?: { amount: number; reason?: string };

    meta?: {
        valid_until?: string;
        reference_doc_no?: string;
        payload_checksum?: string;
    };

    specific?: {
        due_date?: string;
        deposit_amount?: number;
        payment_method?: string;
        payment_ref?: string;
        terms?: string;
        disclaimer?: string;
        bank_info?: string;
        note?: string;              // ✅ NEW: QT note/remarks
        authorized_signer?: string; // ✅ NEW: Signer name for QT
    };


    reference_items?: Array<{
        description: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        amount: number;
    }>;
};

// ✅ DealDocument type (from DB/view)
export type DealDocument = {
    id: string;
    deal_id: string;
    doc_no: string;
    doc_type: DocType;
    status: "draft" | "issued" | "cancelled";
    payload: DocumentPayload;
    payload_version?: number;
    payload_checksum?: string;
    vat_enabled: boolean;
    created_at: string;
    // Voided/cancelled audit fields (from view)
    voided_at?: string;
    voided_by?: string;
    void_reason?: string;
    voided_by_name?: string;
};
