DROP VIEW IF EXISTS public.view_stock_zone_lifecycle;

CREATE OR REPLACE VIEW public.view_stock_zone_lifecycle AS
SELECT
    t.zone_id,
    z.name      AS zone_name,
    z.farm_name AS farm_name,
    z.plot_type,

    t.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,
    s.measure_by_height,

    t.size_label,
    i.height_label, -- Added
    t.grade,

    -- Aggregate counts
    COUNT(*)::int AS total_qty,
    COUNT(*) FILTER (WHERE t.status = 'available')::int   AS available_qty,
    COUNT(*) FILTER (WHERE t.status = 'reserved')::int    AS reserved_qty,
    COUNT(*) FILTER (WHERE t.status = 'dig_ordered')::int AS dig_ordered_qty,
    COUNT(*) FILTER (WHERE t.status = 'dug')::int         AS dug_qty,
    COUNT(*) FILTER (WHERE t.status = 'shipped')::int     AS shipped_qty,
    COUNT(*) FILTER (WHERE t.status = 'planted')::int     AS planted_qty,

    -- Dig purpose breakdown (from 235)
    COALESCE(SUM(
        CASE 
            WHEN t.status = 'dig_ordered' AND o.dig_purpose = 'to_panel' THEN t.qty 
            ELSE 0 
        END
    ), 0)::int AS dig_ordered_to_panel_qty,

    COALESCE(SUM(
        CASE 
            WHEN t.status = 'dig_ordered' AND o.dig_purpose = 'to_customer' THEN t.qty 
            ELSE 0 
        END
    ), 0)::int AS dig_ordered_to_customer_qty,

    COALESCE(SUM(
        CASE 
            WHEN t.status = 'dug' AND o.dig_purpose = 'to_panel' THEN t.qty 
            ELSE 0 
        END
    ), 0)::int AS dug_to_panel_qty,

    COALESCE(SUM(
        CASE 
            WHEN t.status = 'dug' AND o.dig_purpose = 'to_customer' THEN t.qty 
            ELSE 0 
        END
    ), 0)::int AS dug_to_customer_qty

FROM public.tree_tags t
JOIN public.stock_species s ON s.id = t.species_id
JOIN public.stock_zones   z ON z.id = t.zone_id
LEFT JOIN public.stock_items i ON i.id = t.stock_item_id
LEFT JOIN public.dig_order_items  doi ON doi.tag_id = t.id
LEFT JOIN public.dig_orders       o   ON o.id = doi.dig_order_id
GROUP BY
    t.zone_id,
    z.name,
    z.farm_name,
    z.plot_type,
    t.species_id,
    s.name_th,
    s.name_en,
    s.code,
    s.measure_by_height,
    t.size_label,
    i.height_label,
    t.grade
ORDER BY
    s.name_th,
    t.size_label,
    i.height_label,
    t.grade,
    z.farm_name,
    z.name;
