-- 153_create_shipments_table.sql
-- Ensure deal_shipments table exists (renamed from shipments)

CREATE TABLE IF NOT EXISTS public.deal_shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    ship_date DATE DEFAULT CURRENT_DATE,
    transporter_name TEXT,
    tracking_code TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.deal_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.deal_shipments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert/update for authenticated users" ON public.deal_shipments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
