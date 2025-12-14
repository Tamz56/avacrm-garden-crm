-- 209_create_tree_tags_view.sql

DROP VIEW IF EXISTS public.tree_tags_view;

CREATE VIEW public.tree_tags_view AS
SELECT
    t.id,
    t.tag_code,
    t.zone_id,
    z.name        AS zone_name,
    z.farm_name,
    t.species_id,
    s.name_th     AS species_name_th,
    s.name_en     AS species_name_en,
    t.size_label,
    t.qty,
    t.status,
    t.planting_row,
    t.planting_position,
    t.stock_item_id,
    t.deal_id,
    t.shipment_id,
    t.notes,
    t.created_at,
    t.updated_at
FROM public.tree_tags t
LEFT JOIN public.stock_zones   z ON t.zone_id   = z.id
LEFT JOIN public.stock_species s ON t.species_id = s.id;

GRANT SELECT ON public.tree_tags_view TO authenticated;
GRANT SELECT ON public.tree_tags_view TO service_role;
