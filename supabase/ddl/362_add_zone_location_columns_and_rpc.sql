-- 362_add_zone_location_columns_and_rpc.sql
-- Add location columns to stock_zones and create RPC for updating

-- 1. Add columns if not exist (nullable)
ALTER TABLE public.stock_zones
ADD COLUMN IF NOT EXISTS zone_lat double precision,
ADD COLUMN IF NOT EXISTS zone_lng double precision,
ADD COLUMN IF NOT EXISTS zone_map_url text;

-- 2. Drop old function (if exists with old signature)
DROP FUNCTION IF EXISTS public.update_stock_zone_location(uuid, double precision, double precision, text, jsonb);

-- 3. Create RPC for updating location (no boundary param, hardened)
CREATE OR REPLACE FUNCTION public.update_stock_zone_location(
    p_zone_id uuid,
    p_lat double precision,
    p_lng double precision,
    p_map_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.stock_zones
    SET
        zone_lat = p_lat,
        zone_lng = p_lng,
        zone_map_url = p_map_url,
        updated_at = NOW()
    WHERE id = p_zone_id;
END;
$$;

-- 4. Grant execute (matching new signature)
GRANT EXECUTE ON FUNCTION public.update_stock_zone_location(uuid, double precision, double precision, text) TO authenticated;

-- 5. Reload schema
NOTIFY pgrst, 'reload schema';
