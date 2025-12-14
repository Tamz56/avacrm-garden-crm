-- 342_create_get_tag_lifecycle_by_zone_rpc.sql

DROP FUNCTION IF EXISTS public.get_tag_lifecycle_by_zone(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_tag_lifecycle_by_zone(
    p_zone_id    uuid DEFAULT NULL,
    p_species_id uuid DEFAULT NULL
)
RETURNS SETOF public.view_tree_tag_lifecycle_by_zone
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.view_tree_tag_lifecycle_by_zone v
    WHERE (p_zone_id    IS NULL OR v.zone_id    = p_zone_id)
      AND (p_species_id IS NULL OR v.species_id = p_species_id)
    ORDER BY
        v.farm_name,
        v.zone_name,
        v.species_name_th,
        v.size_label;
$$;

GRANT EXECUTE ON FUNCTION public.get_tag_lifecycle_by_zone(uuid, uuid) TO authenticated;
