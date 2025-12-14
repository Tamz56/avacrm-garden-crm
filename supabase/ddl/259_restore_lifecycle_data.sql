-- 259_restore_lifecycle_data.sql

-- 1. Drop dependent views
DROP VIEW IF EXISTS public.view_stock_species_with_pricing;
DROP VIEW IF EXISTS public.view_stock_species_overview;
DROP VIEW IF EXISTS public.view_stock_zone_lifecycle;

-- 2. Recreate view_stock_zone_lifecycle with CTEs (Inventory + Tags)
CREATE OR REPLACE VIEW public.view_stock_zone_lifecycle AS
WITH inv AS (
    -- Inventory from planting_plot_inventory
    SELECT
        i.plot_id AS zone_id,
        i.species_id,
        i.size_label,
        SUM(i.planted_qty)::int AS inventory_qty
    FROM public.planting_plot_inventory i
    GROUP BY
        i.plot_id,
        i.species_id,
        i.size_label
),
tags AS (
    -- Tags from tree_tags
    SELECT
        t.zone_id,
        t.species_id,
        t.size_label,
        t.height_label,
        t.grade::uuid AS grade_id, -- Cast text to uuid
        COUNT(*)::int AS tagged_total_qty,
        
        -- Basic Status Counts
        COUNT(*) FILTER (WHERE t.status = 'in_zone')::int    AS tag_available_qty,
        COUNT(*) FILTER (WHERE t.status = 'reserved')::int    AS tag_reserved_qty,
        COUNT(*) FILTER (WHERE t.status = 'dig_ordered')::int AS tag_dig_ordered_qty,
        COUNT(*) FILTER (WHERE t.status = 'dug')::int         AS tag_dug_qty,
        COUNT(*) FILTER (WHERE t.status = 'shipped')::int     AS tag_shipped_qty,
        COUNT(*) FILTER (WHERE t.status = 'planted')::int     AS tag_planted_qty,

        -- Dig Purpose Breakdowns (Join via dig_order_items)
        COUNT(*) FILTER (WHERE t.status = 'dig_ordered' AND d.dig_purpose = 'to_panel')::int    AS dig_ordered_to_panel_qty,
        COUNT(*) FILTER (WHERE t.status = 'dig_ordered' AND d.dig_purpose = 'to_customer')::int AS dig_ordered_to_customer_qty,
        
        COUNT(*) FILTER (WHERE t.status = 'dug' AND d.dig_purpose = 'to_panel')::int    AS dug_to_panel_qty,
        COUNT(*) FILTER (WHERE t.status = 'dug' AND d.dig_purpose = 'to_customer')::int AS dug_to_customer_qty

    FROM public.tree_tags t
    LEFT JOIN public.dig_order_items di ON di.tag_id = t.id
    LEFT JOIN public.dig_orders d ON d.id = di.dig_order_id
    
    GROUP BY
        t.zone_id,
        t.species_id,
        t.size_label,
        t.height_label,
        t.grade
),
merged AS (
    SELECT
        COALESCE(i.zone_id,      t.zone_id)      AS zone_id,
        COALESCE(i.species_id,   t.species_id)   AS species_id,
        COALESCE(i.size_label,   t.size_label)   AS size_label,
        t.height_label,
        t.grade_id,

        COALESCE(i.inventory_qty, 0)             AS inventory_qty,
        COALESCE(t.tagged_total_qty, 0)          AS tagged_total_qty,
        GREATEST(
            COALESCE(i.inventory_qty, 0) - COALESCE(t.tagged_total_qty, 0),
            0
        )::int                                   AS untagged_qty,

        COALESCE(t.tag_available_qty, 0)         AS available_qty,
        COALESCE(t.tag_reserved_qty, 0)          AS reserved_qty,
        COALESCE(t.tag_dig_ordered_qty, 0)       AS dig_ordered_qty,
        COALESCE(t.tag_dug_qty, 0)               AS dug_qty,
        COALESCE(t.tag_shipped_qty, 0)           AS shipped_qty,
        COALESCE(t.tag_planted_qty, 0)           AS planted_qty,
        
        COALESCE(t.dig_ordered_to_panel_qty, 0)    AS dig_ordered_to_panel_qty,
        COALESCE(t.dig_ordered_to_customer_qty, 0) AS dig_ordered_to_customer_qty,
        COALESCE(t.dug_to_panel_qty, 0)            AS dug_to_panel_qty,
        COALESCE(t.dug_to_customer_qty, 0)         AS dug_to_customer_qty

    FROM inv i
    FULL OUTER JOIN tags t
      ON  i.zone_id      = t.zone_id
      AND i.species_id   = t.species_id
      AND i.size_label   = t.size_label
)
SELECT
    m.zone_id,
    z.name      AS zone_name,
    z.farm_name AS farm_name,
    z.plot_type,

    m.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,
    s.measure_by_height,

    m.size_label,
    m.height_label,
    m.grade_id,
    g.name_th   AS grade_name,
    g.code      AS grade_code,

    (m.inventory_qty)::int        AS inventory_qty,
    (m.tagged_total_qty)::int     AS tagged_total_qty,
    (m.untagged_qty)::int         AS untagged_qty,

    (m.available_qty)::int        AS available_qty,
    (m.reserved_qty)::int         AS reserved_qty,
    (m.dig_ordered_qty)::int      AS dig_ordered_qty,
    (m.dug_qty)::int              AS dug_qty,
    (m.shipped_qty)::int          AS shipped_qty,
    (m.planted_qty)::int          AS planted_qty,
    
    (m.dig_ordered_to_panel_qty)::int    AS dig_ordered_to_panel_qty,
    (m.dig_ordered_to_customer_qty)::int AS dig_ordered_to_customer_qty,
    (m.dug_to_panel_qty)::int            AS dug_to_panel_qty,
    (m.dug_to_customer_qty)::int         AS dug_to_customer_qty

FROM merged m
LEFT JOIN public.stock_zones z ON z.id = m.zone_id
LEFT JOIN public.stock_species s ON s.id = m.species_id
LEFT JOIN public.stock_tree_grades g ON g.id = m.grade_id;

-- 3. Recreate view_stock_species_overview
CREATE OR REPLACE VIEW public.view_stock_species_overview AS
SELECT
    m.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,

    m.size_label,
    m.height_label,
    m.grade_id,
    g.name_th   AS grade_name_th,
    g.code      AS grade_code,

    COUNT(DISTINCT m.zone_id)                      AS zone_count,
    ARRAY_AGG(DISTINCT z.name ORDER BY z.name)     AS zone_names,
    ARRAY_AGG(DISTINCT m.zone_id)                  AS zone_ids,

    SUM(m.tagged_total_qty)::int                   AS total_qty,
    SUM(m.available_qty)::int                      AS available_qty,
    SUM(m.reserved_qty)::int                       AS reserved_qty,
    SUM(m.dig_ordered_qty)::int                    AS dig_ordered_qty,
    SUM(m.dug_qty)::int                            AS dug_qty,
    SUM(m.shipped_qty)::int                        AS shipped_qty,
    SUM(m.planted_qty)::int                        AS planted_qty,
    SUM(m.untagged_qty)::int                       AS untagged_qty,

    SUM(m.dig_ordered_to_panel_qty)::int           AS dig_ordered_to_panel_qty,
    SUM(m.dig_ordered_to_customer_qty)::int        AS dig_ordered_to_customer_qty,
    SUM(m.dug_to_panel_qty)::int                   AS dug_to_panel_qty,
    SUM(m.dug_to_customer_qty)::int                AS dug_to_customer_qty

FROM public.view_stock_zone_lifecycle m
JOIN public.stock_species s ON s.id = m.species_id
LEFT JOIN public.stock_tree_grades g ON g.id = m.grade_id
LEFT JOIN public.stock_zones z ON z.id = m.zone_id
GROUP BY
    m.species_id,
    s.name_th, s.name_en, s.code,
    m.size_label,
    m.height_label,
    m.grade_id,
    g.name_th, g.code;

-- 4. Recreate view_stock_species_with_pricing
CREATE OR REPLACE VIEW public.view_stock_species_with_pricing AS
SELECT
    s.*, 
    p.line_count,
    p.total_qty_sold,
    p.total_revenue,
    p.avg_price_per_tree,
    p.median_price_per_tree,
    p.min_price_per_tree,
    p.max_price_per_tree,
    p.avg_price_per_meter,
    p.median_price_per_meter,
    p.min_price_per_meter,
    p.max_price_per_meter,
    p.last_price_per_tree,
    p.last_price_per_meter,
    p.last_price_type
FROM public.view_stock_species_overview s
LEFT JOIN public.view_stock_pricing_stats p
 ON p.species_id   = s.species_id
 AND p.size_label   = s.size_label
 AND (
      (s.height_label IS NULL AND p.height_label IS NULL)
      OR s.height_label = p.height_label
 );
