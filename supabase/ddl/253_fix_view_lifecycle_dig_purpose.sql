-- 253_fix_view_lifecycle_dig_purpose.sql

DROP VIEW IF EXISTS public.view_stock_zone_lifecycle;

CREATE OR REPLACE VIEW public.view_stock_zone_lifecycle AS
WITH inv AS (
    -- Inventory ที่ติ๊ก "พร้อมขายในสต็อก" เท่านั้น
    SELECT
        i.plot_id AS zone_id,
        i.species_id,
        i.size_label,
        -- i.height_label, -- (ยังไม่มีใน DB)
        -- i.grade_id,     -- (ยังไม่มีใน DB)
        SUM(i.planted_qty)::int AS inventory_qty
    FROM public.planting_plot_inventory i
    -- WHERE i.is_ready_for_stock = true -- (ยังไม่มีใน DB)
    GROUP BY
        i.plot_id,
        i.species_id,
        i.size_label
),
tags AS (
    -- สรุปจำนวน Tag ตามสถานะ และแยกตาม Dig Purpose
    SELECT
        t.zone_id,
        t.species_id,
        t.size_label,
        t.height_label,
        t.grade_id,
        COUNT(*)::int AS tagged_total_qty,
        
        -- Basic Status Counts
        COUNT(*) FILTER (WHERE t.status = 'in_zone')::int    AS tag_available_qty, -- 'in_zone' = available
        COUNT(*) FILTER (WHERE t.status = 'reserved')::int    AS tag_reserved_qty,
        COUNT(*) FILTER (WHERE t.status = 'dig_ordered')::int AS tag_dig_ordered_qty,
        COUNT(*) FILTER (WHERE t.status = 'dug')::int         AS tag_dug_qty,
        COUNT(*) FILTER (WHERE t.status = 'shipped')::int     AS tag_shipped_qty,
        COUNT(*) FILTER (WHERE t.status = 'planted')::int     AS tag_planted_qty,

        -- Dig Purpose Breakdowns (Join with dig_orders via dig_order_items)
        -- Note: This requires a join, so we might need a subquery or join here.
        -- But since we are grouping by tag properties, we can join tree_tags -> dig_order_items -> dig_orders
        -- However, a tag can only be in one active dig order? Yes.
        
        -- To keep it simple in this CTE, we'll do the join inside the CTE
        COUNT(*) FILTER (WHERE t.status = 'dig_ordered' AND d.dig_purpose = 'to_panel')::int    AS dig_ordered_to_panel_qty,
        COUNT(*) FILTER (WHERE t.status = 'dig_ordered' AND d.dig_purpose = 'to_customer')::int AS dig_ordered_to_customer_qty,
        
        COUNT(*) FILTER (WHERE t.status = 'dug' AND d.dig_purpose = 'to_panel')::int    AS dug_to_panel_qty,
        COUNT(*) FILTER (WHERE t.status = 'dug' AND d.dig_purpose = 'to_customer')::int AS dug_to_customer_qty

    FROM public.tree_tags t
    LEFT JOIN public.dig_order_items di ON di.tag_id = t.id
    LEFT JOIN public.dig_orders d ON d.id = di.dig_order_id
    -- We only care about the *latest* dig order if there are multiple? 
    -- But dig_order_items usually implies active order.
    -- If a tag is 'dig_ordered' or 'dug', it should have a corresponding dig_order.
    
    GROUP BY
        t.zone_id,
        t.species_id,
        t.size_label,
        t.height_label,
        t.grade_id
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
        
        -- Pass through split counts
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
    g.name_th   AS grade_name_th,
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
LEFT JOIN public.stock_zones z
       ON z.id = m.zone_id
LEFT JOIN public.stock_species s
       ON s.id = m.species_id
LEFT JOIN public.stock_tree_grades g
       ON g.id = m.grade_id;
