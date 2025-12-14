-- 185_update_digup_and_views.sql

-- 1. Add planting_plot_tree_id to digup_batches
ALTER TABLE public.digup_batches
ADD COLUMN IF NOT EXISTS planting_plot_tree_id uuid REFERENCES public.planting_plot_trees(id);

-- 2. Update view_zone_tree_totals to include digup count
CREATE OR REPLACE VIEW public.view_zone_tree_totals AS
WITH digup_stats AS (
    SELECT
        zone_id,
        SUM(quantity) AS total_digup_qty
    FROM public.digup_batches
    WHERE status != 'cancelled'
    GROUP BY zone_id
)
SELECT
    ppt.plot_id AS zone_id,
    COALESCE(SUM(ppt.planted_count), 0) AS planned_tree_count,
    COALESCE(SUM(ppt.planted_count), 0) AS planted_tree_count,
    COALESCE(SUM(ppt.planted_count - ppt.moved_to_stock_count), 0) AS remaining_tree_count,
    COALESCE(ds.total_digup_qty, 0) AS total_digup_qty,
    STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) AS species_summary
FROM
    public.planting_plot_trees ppt
LEFT JOIN
    public.stock_species s ON ppt.species_id = s.id
LEFT JOIN
    digup_stats ds ON ds.zone_id = ppt.plot_id
GROUP BY
    ppt.plot_id, ds.total_digup_qty;

-- 3. Update view_stock_zones_with_tree_totals to include total_digup_qty
CREATE OR REPLACE VIEW public.view_stock_zones_with_tree_totals AS
SELECT
    sz.id,
    sz.name,
    sz.farm_name,
    sz.farm_name AS location_name,
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
    sz.inspection_date AS last_inspection_date,
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
    COALESCE(t.total_digup_qty, 0) AS total_digup_qty,
    COALESCE(t.species_summary, '') AS species_summary

FROM public.stock_zones sz
LEFT JOIN public.planting_plot_detail_lookup l ON l.id = sz.plot_type
LEFT JOIN public.view_zone_tree_totals t ON t.zone_id = sz.id;

GRANT SELECT ON public.view_zone_tree_totals TO authenticated;
GRANT SELECT ON public.view_stock_zones_with_tree_totals TO authenticated;

NOTIFY pgrst, 'reload schema';
