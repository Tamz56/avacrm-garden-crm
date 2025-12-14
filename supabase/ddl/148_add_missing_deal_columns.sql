-- 148_add_missing_deal_columns.sql
-- Add missing columns for Deal Enhancements

-- 1. Add shipping_cost to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(12,2) DEFAULT 0;

-- 2. Add trunk_size_inch to deal_items table
ALTER TABLE public.deal_items 
ADD COLUMN IF NOT EXISTS trunk_size_inch NUMERIC(10,2);

-- 3. Refresh schema cache (notify PostgREST)
NOTIFY pgrst, 'reload schema';
