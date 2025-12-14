-- 243_update_view_zone_overview.sql

DROP VIEW IF EXISTS public.view_zone_overview;

CREATE OR REPLACE VIEW public.view_zone_overview AS
WITH inventory_stats AS (
    SELECT
        plot_id,
        SUM(planted_qty) AS total_planted_plan,
        SUM(created_tag_qty) AS total_tagged,
        SUM(planted_qty - created_tag_qty) AS total_remaining_for_tag
    FROM public.planting_plot_inventory
    GROUP BY plot_id
),
zone_status_stats AS (
    SELECT
        zone_id,
        SUM(dugup_done_qty) AS total_digup_done_qty,
        SUM(dugup_in_progress_qty) AS total_digup_in_progress_qty,
        SUM(dugup_planned_qty) AS total_digup_planned_qty,
        SUM(dead_qty) AS total_dead_qty
    FROM public.view_zone_tree_inventory_flow
    GROUP BY zone_id
)
SELECT
    z.id,
    z.name,
    z.farm_name,
    z.area_rai,
    z.area_width_m,
    z.area_length_m,
    z.description,
    z.planting_rows,
    z.pump_size_hp,
    z.water_source,
    z.inspection_date,
    z.inspection_trunk_inch,
    z.inspection_height_m,
    z.inspection_pot_inch,
    z.inspection_notes,
    z.created_at,
    z.plot_type,
    COALESCE(l.name_th, 'ไม่ระบุ') AS plot_type_name,
    
    -- Inventory Stats (New Source)
    COALESCE(inv.total_planted_plan, 0) AS total_planted_plan,
    COALESCE(inv.total_tagged, 0) AS total_tagged,
    COALESCE(inv.total_remaining_for_tag, 0) AS total_remaining_for_tag,
    
    -- Detailed Statuses
    COALESCE(s.total_digup_done_qty, 0) AS total_digup_done_qty,
    COALESCE(s.total_digup_in_progress_qty, 0) AS total_digup_in_progress_qty,
    COALESCE(s.total_digup_planned_qty, 0) AS total_digup_planned_qty,
    COALESCE(s.total_dead_qty, 0) AS total_dead_qty,
    
    -- Legacy columns mapping & Computed columns for Frontend
    COALESCE(inv.total_planted_plan, 0) AS total_planted_qty,
    
    (COALESCE(s.total_digup_done_qty, 0) + COALESCE(s.total_digup_in_progress_qty, 0)) AS total_digup_qty,
    
    (COALESCE(inv.total_planted_plan, 0) - 
     (COALESCE(s.total_digup_done_qty, 0) + COALESCE(s.total_digup_in_progress_qty, 0) + COALESCE(s.total_dead_qty, 0))
    ) AS total_remaining_qty
    
FROM public.stock_zones z
LEFT JOIN public.planting_plot_detail_lookup l ON z.plot_type = l.id
LEFT JOIN inventory_stats inv ON z.id = inv.plot_id
LEFT JOIN zone_status_stats s ON z.id = s.zone_id;

GRANT SELECT ON public.view_zone_overview TO authenticated;
