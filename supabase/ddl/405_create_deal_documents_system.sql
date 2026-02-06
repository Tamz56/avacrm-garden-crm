-- 405_create_deal_documents_system.sql
-- Document System (QT, INV, DEP, RCPT) with atomic numbering and snapshots
-- ============================================================

-- 1) Enums
DO $$ BEGIN
    CREATE TYPE public.doc_type_enum AS ENUM ('QT', 'INV', 'DEP', 'RCPT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.doc_status_enum AS ENUM ('issued', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Atomic Numbering Table
CREATE TABLE IF NOT EXISTS public.document_numbers (
    doc_type public.doc_type_enum NOT NULL,
    month_str TEXT NOT NULL, -- Format: YYYYMM
    last_no INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT document_numbers_pkey PRIMARY KEY (doc_type, month_str)
);

-- 3) Deal Documents Table
CREATE TABLE IF NOT EXISTS public.deal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id),
    doc_type public.doc_type_enum NOT NULL,
    doc_no TEXT NOT NULL UNIQUE,
    status public.doc_status_enum NOT NULL DEFAULT 'issued',
    payload JSONB NOT NULL, -- Immutable snapshot (items, customer, totals, vat, disclaimers)
    pdf_url TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by UUID,
    void_reason TEXT,

    -- Note: Void policy - If child docs exist (e.g., RCPT linked to INV),
    -- users should void child docs first or handle manually for now.
    -- Future: Add parent_doc_id for linking.

    CONSTRAINT deal_documents_doc_no_check CHECK (doc_no <> '')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON public.deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_doc_no ON public.deal_documents(doc_no);
CREATE INDEX IF NOT EXISTS idx_deal_documents_type_status ON public.deal_documents(doc_type, status);

-- 4) Concurrency-safe Doc Numbering RPC
CREATE OR REPLACE FUNCTION public.next_doc_no_v1(
    p_doc_type public.doc_type_enum,
    p_doc_date DATE DEFAULT CURRENT_DATE,
    p_org_prefix TEXT DEFAULT '' -- Flexible prefix (e.g., 'AVA-')
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_month_str TEXT := to_char(p_doc_date, 'YYYYMM');
    v_new_no INTEGER;
    v_prefix TEXT := COALESCE(p_org_prefix, '');
BEGIN
    -- Atomic UPSERT to increment counter
    INSERT INTO public.document_numbers (doc_type, month_str, last_no)
    VALUES (p_doc_type, v_month_str, 1)
    ON CONFLICT (doc_type, month_str) 
    DO UPDATE SET 
        last_no = document_numbers.last_no + 1,
        updated_at = NOW()
    RETURNING last_no INTO v_new_no;

    -- Format: [PREFIX]TYPE-YYYYMM-#### (4 digits)
    -- Flexible format logic
    RETURN v_prefix || p_doc_type::text || '-' || v_month_str || '-' || LPAD(v_new_no::text, 4, '0');
END;
$$;

-- 5) RLS Policies
ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_numbers ENABLE ROW LEVEL SECURITY;

-- Only admins/managers should touch document_numbers, but for now we allow authenticated for RPC to work.
-- The RPC is SECURITY DEFINER, so it can bypass RLS on document_numbers.
CREATE POLICY "Allow authenticated read numbers" ON public.document_numbers FOR SELECT TO authenticated USING (true);

-- deal_documents policies based on deal access
CREATE POLICY "Allow members to read documents"
ON public.deal_documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.deals d
        WHERE d.id = deal_documents.deal_id
    )
);

CREATE POLICY "Allow members to create documents"
ON public.deal_documents
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.deals d
        WHERE d.id = deal_documents.deal_id
    )
);

-- Update for Voiding
CREATE POLICY "Allow members to void documents"
ON public.deal_documents
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.deals d
        WHERE d.id = deal_documents.deal_id
    )
)
WITH CHECK (
    -- Only allow status transition to voided
    status = 'voided'
);
