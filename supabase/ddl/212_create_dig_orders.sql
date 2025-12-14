-- 212_create_dig_orders.sql

-- 0. Cleanup (Reset)
DROP VIEW IF EXISTS public.view_deal_dig_orders;
DROP TABLE IF EXISTS public.dig_order_items;
DROP TABLE IF EXISTS public.dig_orders;

-- 1. Create dig_orders table
CREATE TABLE IF NOT EXISTS public.dig_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL, -- Running number e.g., 'DIG-2025-0001'
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'completed', 'cancelled')),
    scheduled_date DATE,
    notes TEXT, -- Changed from note to notes
    created_by_profile_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create dig_order_items table
CREATE TABLE IF NOT EXISTS public.dig_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dig_order_id UUID NOT NULL REFERENCES public.dig_orders(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tree_tags(id) ON DELETE CASCADE,
    note TEXT, -- Item note can remain note or notes, let's keep note for item specific
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraint: A tag can only be in one dig order item (to prevent duplicate processing)
    CONSTRAINT unique_tag_in_dig_orders UNIQUE (tag_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_dig_orders_deal_id ON public.dig_orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_dig_order_items_dig_order_id ON public.dig_order_items(dig_order_id);
CREATE INDEX IF NOT EXISTS idx_dig_order_items_tag_id ON public.dig_order_items(tag_id);

-- 4. View for Deal Dig Orders
CREATE OR REPLACE VIEW public.view_deal_dig_orders AS
SELECT 
    d.id,
    d.deal_id,
    d.code,
    d.status,
    d.scheduled_date,
    d.notes, -- Changed from note to notes
    d.created_at,
    COUNT(doi.id) AS tags_count
FROM public.dig_orders d
LEFT JOIN public.dig_order_items doi ON d.id = doi.dig_order_id
GROUP BY d.id;

-- 5. Enable RLS
ALTER TABLE public.dig_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dig_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.dig_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.dig_order_items FOR ALL USING (auth.role() = 'authenticated');
