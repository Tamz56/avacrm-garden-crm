-- 363_add_update_zone_boundary_rpc.sql
-- Update zone boundary geojson via RPC

-- Ensure column exists (it already exists in your schema, but keep safe)
ALTER TABLE public.stock_zones
ADD COLUMN IF NOT EXISTS zone_boundary_geojson jsonb;

DROP FUNCTION IF EXISTS public.update_stock_zone_boundary(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.update_stock_zone_boundary(
  p_zone_id uuid,
  p_boundary_geojson jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stock_zones
  SET
    zone_boundary_geojson = p_boundary_geojson,
    updated_at = NOW()
  WHERE id = p_zone_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_stock_zone_boundary(uuid, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
