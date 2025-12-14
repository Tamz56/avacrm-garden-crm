-- 346_create_view_tree_tag_lifecycle_breakdown.sql
-- Height/Grade level breakdown view for drill-down
-- Grain: (zone_id, species_id, size_label, height_label, grade_id)

DROP VIEW IF EXISTS public.view_tree_tag_lifecycle_breakdown CASCADE;

CREATE OR REPLACE VIEW public.view_tree_tag_lifecycle_breakdown AS
WITH tags AS (
    SELECT
        t.zone_id,
        t.species_id,
        t.size_label,
        t.height_label,
        t.grade_id,
        
        COUNT(DISTINCT t.id)::int AS tagged_total_qty,
        
        -- Basic Status Counts
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_zone')::int       AS available_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'reserved')::int      AS reserved_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dig_ordered')::int   AS dig_ordered_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dug')::int           AS dug_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'shipped')::int       AS shipped_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'planted')::int       AS planted_qty,
        
        -- Workflow Status Counts
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'selected_for_dig')::int AS selected_for_dig_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('root_prune_1', 'root_prune_2', 'root_prune_3', 'root_prune_4'))::int AS root_prune_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'ready_to_lift')::int    AS ready_to_lift_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'rehab')::int            AS rehab_qty,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'dead')::int             AS dead_qty,

        -- Dig Purpose Breakdowns
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
        t.size_label,
        t.height_label,
        t.grade_id
)
SELECT
    t.zone_id,
    z.name      AS zone_name,
    z.farm_name AS farm_name,
    z.plot_type,

    t.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,

    t.size_label,
    t.height_label,
    t.grade_id,
    g.name_th   AS grade_name_th,
    g.code      AS grade_code,

    -- Tag counts (no inventory in this view)
    t.tagged_total_qty,

    -- Basic status
    t.available_qty,
    t.reserved_qty,
    t.dig_ordered_qty,
    t.dug_qty,
    t.shipped_qty,
    t.planted_qty,
    
    -- Workflow status
    t.selected_for_dig_qty,
    t.root_prune_qty,
    t.ready_to_lift_qty,
    t.rehab_qty,
    t.dead_qty,
    
    -- Dig purpose breakdown
    t.dig_ordered_to_panel_qty,
    t.dig_ordered_to_customer_qty,
    t.dug_to_panel_qty,
    t.dug_to_customer_qty

FROM tags t
LEFT JOIN public.stock_zones z       ON z.id = t.zone_id
LEFT JOIN public.stock_species s     ON s.id = t.species_id
LEFT JOIN public.stock_tree_grades g ON g.id = t.grade_id;

-- Grant permissions
GRANT SELECT ON public.view_tree_tag_lifecycle_breakdown TO authenticated;
GRANT SELECT ON public.view_tree_tag_lifecycle_breakdown TO service_role;
