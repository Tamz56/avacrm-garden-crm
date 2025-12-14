-- 181_update_view_stock_zones_list_totals.sql

CREATE OR REPLACE VIEW public.view_stock_zones_list AS
SELECT
    sz.id,
    sz.name,
    sz.farm_name,
    sz.farm_name AS location_name, -- Alias for compatibility
    sz.description,
    sz.plot_type,
    l.code AS plot_type_code,
    l.name_th AS plot_type_name,
    
    -- New fields from stock_zones
    sz.area_rai,
    sz.area_width_m,
    sz.area_length_m,
    sz.planting_rows,
    sz.pump_size_hp,
    sz.water_source,
    sz.inspection_date AS last_inspection_date, -- Alias
    sz.inspection_date,
    sz.inspection_trunk_inch,
    sz.inspection_height_m,
    sz.inspection_pot_inch,
    sz.inspection_notes,
    sz.created_at,

    -- Aggregated totals from view_zone_tree_totals
    COALESCE(t.planned_tree_count, 0) AS planned_tree_count,
    COALESCE(t.planted_tree_count, 0) AS planted_tree_count,
    COALESCE(t.remaining_tree_count, 0) AS remaining_tree_count,
    COALESCE(t.species_summary, '') AS species_summary

FROM public.stock_zones sz
LEFT JOIN public.planting_plot_detail_lookup l ON l.id = sz.plot_type
LEFT JOIN public.view_zone_tree_totals t ON t.zone_id = sz.id;

GRANT SELECT ON public.view_stock_zones_list TO authenticated;

NOTIFY pgrst, 'reload schema';
