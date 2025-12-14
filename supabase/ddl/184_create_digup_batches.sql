-- 184_create_digup_batches.sql

CREATE TABLE IF NOT EXISTS public.digup_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES public.stock_zones(id),
    species_id UUID NOT NULL REFERENCES public.stock_species(id),
    size_label TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planned', 'digging', 'completed', 'cancelled')),
    requested_date DATE,
    planned_date DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies if needed, for now grant access
GRANT ALL ON public.digup_batches TO authenticated;
GRANT ALL ON public.digup_batches TO service_role;

NOTIFY pgrst, 'reload schema';
