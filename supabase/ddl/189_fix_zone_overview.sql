-- 189_fix_zone_overview.sql

DROP VIEW IF EXISTS public.view_zone_overview;

CREATE OR REPLACE VIEW public.view_zone_overview AS
WITH zone_tree_agg AS (
    -- Aggregate first to avoid duplicates if multiple trees per zone
    SELECT
        ppt.plot_id AS zone_id, -- plot_id references stock_zones.id directly
        SUM(st.planted_qty) AS planted_qty,
        SUM(st.dugup_qty) AS dugup_qty,
        SUM(st.remaining_qty) AS remaining_qty
    FROM public.planting_plot_trees ppt
    JOIN public.view_planting_plot_tree_status st ON st.planting_plot_tree_id = ppt.id
    GROUP BY ppt.plot_id
)
SELECT
    z.id,
    z.name,
    z.farm_name,
    z.farm_name AS location_name, -- Alias for frontend compatibility
    z.description,
    z.plot_type,
    l.code AS plot_type_code,     -- From lookup
    l.name_th AS plot_type_name,  -- From lookup
    
    z.area_rai,
    z.area_width_m,
    z.area_length_m,
    z.planting_rows,
    z.pump_size_hp,
    z.water_source,
    z.inspection_date AS last_inspection_date, -- Alias
    z.inspection_date,
    z.inspection_trunk_inch,
    z.inspection_height_m,
    z.inspection_pot_inch,
    z.inspection_notes,
    z.created_at,

    COALESCE(agg.planted_qty, 0)   AS total_planted_qty,
    COALESCE(agg.dugup_qty, 0)     AS total_digup_qty,
    COALESCE(agg.remaining_qty, 0) AS total_remaining_qty

FROM public.stock_zones z
LEFT JOIN public.planting_plot_detail_lookup l ON l.id = z.plot_type
LEFT JOIN zone_tree_agg agg ON agg.zone_id = z.id;

GRANT SELECT ON public.view_zone_overview TO authenticated;
NOTIFY pgrst, 'reload schema';
