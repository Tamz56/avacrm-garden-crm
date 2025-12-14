-- 348_create_get_tagged_qty_rpc.sql
-- Simple RPC to count existing tags for a (zone_id, species_id, size_label) combination

CREATE OR REPLACE FUNCTION public.get_tagged_qty(
  p_zone_id     uuid,
  p_species_id  uuid,
  p_size_label  text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::int
  FROM public.tree_tags
  WHERE zone_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label;
$$;

GRANT EXECUTE ON FUNCTION public.get_tagged_qty(uuid, uuid, text) TO authenticated;
