-- 178_create_view_planting_plot_detail.sql

CREATE OR REPLACE VIEW public.view_planting_plot_detail AS
SELECT
    ppt.id AS plot_tree_id,
    ppt.plot_id,
    ppt.species_id,
    s.name AS species_name_th,
    s.common_name AS species_name_en,
    ppt.size_label,
    ppt.planted_count,
    ppt.moved_to_stock_count,
    (ppt.planted_count - ppt.moved_to_stock_count) AS remaining_in_plot,
    ppt.planted_date,
    -- ppt.row_count, -- Assuming this column might exist or we add it later, for now omitting if not in schema
    -- ppt.height_m, -- Same here
    ppt.note
FROM
    public.planting_plot_trees ppt
LEFT JOIN
    public.stock_species s ON ppt.species_id = s.id;

GRANT SELECT ON public.view_planting_plot_detail TO authenticated;

NOTIFY pgrst, 'reload schema';
