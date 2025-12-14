-- 341_create_view_tree_tag_lifecycle_by_zone.sql

DROP VIEW IF EXISTS public.view_tree_tag_lifecycle_by_zone;

CREATE OR REPLACE VIEW public.view_tree_tag_lifecycle_by_zone AS
SELECT
    t.zone_id,
    z.name      AS zone_name,
    z.farm_name AS farm_name,

    t.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,

    t.size_label,

    -- นับจำนวน Tag / Qty ตามสถานะ
    COUNT(*) FILTER (WHERE TRUE)::int                    AS total_tags,
    COUNT(*) FILTER (WHERE t.status = 'in_zone')::int    AS in_zone_qty,
    COUNT(*) FILTER (WHERE t.status = 'reserved')::int   AS reserved_qty,
    COUNT(*) FILTER (WHERE t.status = 'dig_ordered')::int AS dig_ordered_qty,
    COUNT(*) FILTER (WHERE t.status = 'dug')::int        AS dug_qty,
    COUNT(*) FILTER (WHERE t.status = 'shipped')::int    AS shipped_qty,
    COUNT(*) FILTER (WHERE t.status = 'planted')::int    AS planted_qty,
    COUNT(*) FILTER (WHERE t.status = 'cancelled')::int  AS cancelled_qty

FROM public.tree_tags t
LEFT JOIN public.stock_zones   z ON z.id = t.zone_id
LEFT JOIN public.stock_species s ON s.id = t.species_id
GROUP BY
    t.zone_id,
    z.name,
    z.farm_name,
    t.species_id,
    s.name_th,
    s.name_en,
    s.code,
    t.size_label;
