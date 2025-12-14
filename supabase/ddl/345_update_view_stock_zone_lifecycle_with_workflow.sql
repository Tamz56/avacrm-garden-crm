-- 345_update_view_stock_zone_lifecycle_with_workflow.sql
-- Size-level view only (zone_id, species_id, size_label)
-- No height_label / grade_id to avoid inventory duplication

DROP VIEW IF EXISTS public.view_stock_zone_lifecycle CASCADE;

CREATE OR REPLACE VIEW public.view_stock_zone_lifecycle AS
WITH inv AS (
    -- Inventory (size-level grain)
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
    -- Tag counts (size-level grain)
    -- Use COUNT(DISTINCT t.id) to avoid duplicates from dig_order_items join
    SELECT
        t.zone_id,
        t.species_id,
        t.size_label,
        
        COUNT(DISTINCT t.id)::int AS tagged_total_qty,
        
        -- Basic Status Counts
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_zone')::int       AS tag_available_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'reserved')::int      AS tag_reserved_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dig_ordered')::int   AS tag_dig_ordered_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dug')::int           AS tag_dug_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'shipped')::int       AS tag_shipped_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'planted')::int       AS tag_planted_qty,
        
        -- Workflow Status Counts
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'selected_for_dig')::int AS tag_selected_for_dig_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('root_prune_1', 'root_prune_2', 'root_prune_3', 'root_prune_4'))::int AS tag_root_prune_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'ready_to_lift')::int    AS tag_ready_to_lift_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'rehab')::int            AS tag_rehab_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dead')::int             AS tag_dead_qty,

        -- Dig Purpose Breakdowns (need join to dig_orders)
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dig_ordered' AND d.dig_purpose = 'to_panel')::int    AS dig_ordered_to_panel_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dig_ordered' AND d.dig_purpose = 'to_customer')::int AS dig_ordered_to_customer_qty,
        
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dug' AND d.dig_purpose = 'to_panel')::int    AS dug_to_panel_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dug' AND d.dig_purpose = 'to_customer')::int AS dug_to_customer_qty

    FROM public.tree_tags t
    LEFT JOIN public.dig_order_items di ON di.tag_id = t.id
    LEFT JOIN public.dig_orders d ON d.id = di.dig_order_id
    
    GROUP BY
        t.zone_id,
        t.species_id,
        t.size_label
),
merged AS (
    SELECT
        COALESCE(i.zone_id,    t.zone_id)    AS zone_id,
        COALESCE(i.species_id, t.species_id) AS species_id,
        COALESCE(i.size_label, t.size_label) AS size_label,

        COALESCE(i.inventory_qty, 0)         AS inventory_qty,
        COALESCE(t.tagged_total_qty, 0)      AS tagged_total_qty,
        GREATEST(
            COALESCE(i.inventory_qty, 0) - COALESCE(t.tagged_total_qty, 0),
            0
        )::int                               AS untagged_qty,

        COALESCE(t.tag_available_qty, 0)     AS available_qty,
        COALESCE(t.tag_reserved_qty, 0)      AS reserved_qty,
        COALESCE(t.tag_dig_ordered_qty, 0)   AS dig_ordered_qty,
        COALESCE(t.tag_dug_qty, 0)           AS dug_qty,
        COALESCE(t.tag_shipped_qty, 0)       AS shipped_qty,
        COALESCE(t.tag_planted_qty, 0)       AS planted_qty,
        
        -- Workflow counts
        COALESCE(t.tag_selected_for_dig_qty, 0) AS selected_for_dig_qty,
        COALESCE(t.tag_root_prune_qty, 0)       AS root_prune_qty,
        COALESCE(t.tag_ready_to_lift_qty, 0)    AS ready_to_lift_qty,
        COALESCE(t.tag_rehab_qty, 0)            AS rehab_qty,
        COALESCE(t.tag_dead_qty, 0)             AS dead_qty,
        
        COALESCE(t.dig_ordered_to_panel_qty, 0)    AS dig_ordered_to_panel_qty,
        COALESCE(t.dig_ordered_to_customer_qty, 0) AS dig_ordered_to_customer_qty,
        COALESCE(t.dug_to_panel_qty, 0)            AS dug_to_panel_qty,
        COALESCE(t.dug_to_customer_qty, 0)         AS dug_to_customer_qty

    FROM inv i
    FULL OUTER JOIN tags t
      ON  i.zone_id    = t.zone_id
      AND i.species_id = t.species_id
      AND i.size_label = t.size_label
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

    -- Total
    (m.inventory_qty)::int        AS total_qty,
    (m.inventory_qty)::int        AS inventory_qty,
    (m.tagged_total_qty)::int     AS tagged_total_qty,
    (m.untagged_qty)::int         AS untagged_qty,

    -- Basic status
    (m.available_qty)::int        AS available_qty,
    (m.reserved_qty)::int         AS reserved_qty,
    (m.dig_ordered_qty)::int      AS dig_ordered_qty,
    (m.dug_qty)::int              AS dug_qty,
    (m.shipped_qty)::int          AS shipped_qty,
    (m.planted_qty)::int          AS planted_qty,
    
    -- Workflow status
    (m.selected_for_dig_qty)::int AS selected_for_dig_qty,
    (m.root_prune_qty)::int       AS root_prune_qty,
    (m.ready_to_lift_qty)::int    AS ready_to_lift_qty,
    (m.rehab_qty)::int            AS rehab_qty,
    (m.dead_qty)::int             AS dead_qty,
    
    -- Dig purpose breakdown
    (m.dig_ordered_to_panel_qty)::int    AS dig_ordered_to_panel_qty,
    (m.dig_ordered_to_customer_qty)::int AS dig_ordered_to_customer_qty,
    (m.dug_to_panel_qty)::int            AS dug_to_panel_qty,
    (m.dug_to_customer_qty)::int         AS dug_to_customer_qty

FROM merged m
LEFT JOIN public.stock_zones z   ON z.id = m.zone_id
LEFT JOIN public.stock_species s ON s.id = m.species_id;

-- Grant permissions
GRANT SELECT ON public.view_stock_zone_lifecycle TO authenticated;
GRANT SELECT ON public.view_stock_zone_lifecycle TO service_role;

-- =============================================================================
-- VALIDATION QUERIES (run after deploying)
-- =============================================================================
/*
-- 1. inventory_qty >= tagged_total_qty for all rows
SELECT zone_name, species_name_th, size_label, inventory_qty, tagged_total_qty
FROM view_stock_zone_lifecycle
WHERE inventory_qty < tagged_total_qty;
-- Should return 0 rows

-- 2. untagged_qty = GREATEST(inventory_qty - tagged_total_qty, 0)
SELECT zone_name, species_name_th, size_label, 
       inventory_qty, tagged_total_qty, untagged_qty,
       GREATEST(inventory_qty - tagged_total_qty, 0) AS expected_untagged
FROM view_stock_zone_lifecycle
WHERE untagged_qty <> GREATEST(inventory_qty - tagged_total_qty, 0);
-- Should return 0 rows

-- 3. dig_ordered breakdown <= dig_ordered_qty
SELECT zone_name, species_name_th, size_label,
       dig_ordered_qty, dig_ordered_to_panel_qty, dig_ordered_to_customer_qty
FROM view_stock_zone_lifecycle
WHERE dig_ordered_to_panel_qty + dig_ordered_to_customer_qty > dig_ordered_qty;
-- Should return 0 rows

-- 4. dug breakdown <= dug_qty
SELECT zone_name, species_name_th, size_label,
       dug_qty, dug_to_panel_qty, dug_to_customer_qty
FROM view_stock_zone_lifecycle
WHERE dug_to_panel_qty + dug_to_customer_qty > dug_qty;
-- Should return 0 rows
*/
