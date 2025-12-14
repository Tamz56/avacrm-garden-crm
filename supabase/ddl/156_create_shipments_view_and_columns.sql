-- 156_create_shipments_view_and_columns.sql

-- 1. Add missing columns to deal_shipments table
-- We add ALL potentially missing columns here to be safe, including those from the base table definition
ALTER TABLE public.deal_shipments
ADD COLUMN IF NOT EXISTS tracking_code TEXT,
ADD COLUMN IF NOT EXISTS transporter_name TEXT,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_price NUMERIC,
ADD COLUMN IF NOT EXISTS final_price NUMERIC,
ADD COLUMN IF NOT EXISTS vehicle_type_id UUID,
ADD COLUMN IF NOT EXISTS vehicle_code TEXT,
ADD COLUMN IF NOT EXISTS vehicle_name TEXT;

-- 2. Create view_shipments_with_deal
CREATE OR REPLACE VIEW public.view_shipments_with_deal AS
SELECT
    ds.id,
    ds.ship_date,
    ds.deal_id,
    d.title AS deal_title,
    d.customer_name,
    ds.transporter_name,
    ds.tracking_code,
    ds.distance_km,
    ds.estimated_price,
    ds.final_price,
    ds.note,
    ds.vehicle_type_id,
    ds.vehicle_code,
    ds.vehicle_name,
    ds.created_at
FROM public.deal_shipments ds
LEFT JOIN public.deals d ON ds.deal_id = d.id;

-- Grant access to the view
GRANT SELECT ON public.view_shipments_with_deal TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
