-- 195_upgrade_zone_overview_for_statuses.sql

-- Drop existing view
DROP VIEW IF EXISTS public.view_zone_overview;

-- Re-create view with detailed status columns
CREATE OR REPLACE VIEW public.view_zone_overview AS
WITH zone_status_stats AS (
    SELECT
        zone_id,
        -- Aggregate from the detailed inventory flow view
        SUM(dugup_done_qty) AS total_digup_done_qty,
        SUM(dugup_in_progress_qty) AS total_digup_in_progress_qty,
        SUM(dugup_planned_qty) AS total_digup_planned_qty,
        SUM(dead_qty) AS total_dead_qty
    FROM public.view_zone_tree_inventory_flow
    GROUP BY zone_id
),
zone_planted_stats AS (
    SELECT 
        plot_id, 
        SUM(planted_count) as total_planted
    FROM public.planting_plot_trees
    GROUP BY plot_id
)
SELECT
    z.id,
    z.name,
    z.farm_name,
    z.plot_type,
    COALESCE(l.name_th, 'ไม่ระบุ') AS plot_type_name,
    
    -- Total Planted
    COALESCE(zp.total_planted, 0) AS total_planted_qty,
    
    -- Detailed Statuses
    COALESCE(s.total_digup_done_qty, 0) AS total_digup_done_qty,
    COALESCE(s.total_digup_in_progress_qty, 0) AS total_digup_in_progress_qty,
    COALESCE(s.total_digup_planned_qty, 0) AS total_digup_planned_qty,
    COALESCE(s.total_dead_qty, 0) AS total_dead_qty,
    
    -- Total Digup (Legacy/Summary - maps to Done)
    COALESCE(s.total_digup_done_qty, 0) AS total_digup_qty,
    
    -- Total Remaining (Real in ground)
    -- Formula: Planted - Done - Dead
    GREATEST(0, 
        COALESCE(zp.total_planted, 0) 
        - COALESCE(s.total_digup_done_qty, 0) 
        - COALESCE(s.total_dead_qty, 0)
    ) AS total_remaining_qty

FROM public.stock_zones z
LEFT JOIN public.planting_plot_detail_lookup l ON z.plot_type = l.id
LEFT JOIN zone_planted_stats zp ON z.id = zp.plot_id
LEFT JOIN zone_status_stats s ON z.id = s.zone_id;

GRANT SELECT ON public.view_zone_overview TO authenticated;
