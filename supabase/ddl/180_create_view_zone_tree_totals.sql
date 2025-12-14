-- 180_create_view_zone_tree_totals.sql

CREATE OR REPLACE VIEW public.view_zone_tree_totals AS
SELECT
    plot_id AS zone_id,
    COALESCE(SUM(planted_count), 0) AS planned_tree_count,
    COALESCE(SUM(planted_count), 0) AS planted_tree_count, -- Currently same as planned
    COALESCE(SUM(planted_count - moved_to_stock_count), 0) AS remaining_tree_count,
    -- Aggregate species names for summary
    STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) AS species_summary
FROM
    public.planting_plot_trees ppt
LEFT JOIN
    public.stock_species s ON ppt.species_id = s.id
GROUP BY
    plot_id;

GRANT SELECT ON public.view_zone_tree_totals TO authenticated;

NOTIFY pgrst, 'reload schema';
