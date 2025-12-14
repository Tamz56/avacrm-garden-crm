CREATE TABLE IF NOT EXISTS public.zone_digup_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES public.stock_zones(id),
    digup_date DATE NOT NULL,
    qty INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_zone_digup_orders_updated_at
BEFORE UPDATE ON public.zone_digup_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zone_digup_orders_zone_id
    ON public.zone_digup_orders (zone_id);

CREATE INDEX IF NOT EXISTS idx_zone_digup_orders_digup_date
    ON public.zone_digup_orders (digup_date);

GRANT ALL ON public.zone_digup_orders TO authenticated;
GRANT ALL ON public.zone_digup_orders TO service_role;

NOTIFY pgrst, 'reload schema';
