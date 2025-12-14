-- Create enum type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_status') THEN
    CREATE TYPE public.shipment_status AS ENUM ('draft', 'completed', 'cancelled');
  END IF;
END
$$;

-- Add status column to deal_shipments (not shipments)
ALTER TABLE public.deal_shipments
ADD COLUMN IF NOT EXISTS status public.shipment_status NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_deal_shipments_status
ON public.deal_shipments(status);

-- Update the view to include the status column
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
    ds.created_at,
    ds.status  -- Added status column
FROM public.deal_shipments ds
LEFT JOIN public.deals d ON ds.deal_id = d.id;

-- Grant access to the view
GRANT SELECT ON public.view_shipments_with_deal TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
