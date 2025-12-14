-- 205_create_species_zone_breakdown_rpc.sql

CREATE OR REPLACE FUNCTION public.get_species_zone_breakdown(p_species_id uuid)
RETURNS TABLE (
  zone_id uuid,
  zone_name text,
  farm_name text,
  total_items bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.zone_id,
    sz.name as zone_name,
    sz.farm_name,
    count(si.id) as total_items
  FROM public.stock_items si
  JOIN public.stock_zones sz ON si.zone_id = sz.id
  WHERE si.species_id = p_species_id
  GROUP BY si.zone_id, sz.name, sz.farm_name
  ORDER BY total_items DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_species_zone_breakdown(uuid) TO authenticated;
