-- supabase/ddl/230_create_stock_price_list.sql

CREATE TABLE IF NOT EXISTS public.stock_price_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    species_id UUID NOT NULL REFERENCES public.stock_species(id),
    size_label TEXT NOT NULL,
    grade      TEXT NOT NULL DEFAULT 'A',   -- เช่น A/B/C/Reject

    base_price NUMERIC(12,2) NOT NULL,      -- ราคา/ต้น
    currency   TEXT NOT NULL DEFAULT 'THB',

    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to   DATE,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_price_list_key
    ON public.stock_price_list (species_id, size_label, grade, is_active);
