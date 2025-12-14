-- 183_create_view_zone_tree_inventory_flow.sql

DROP VIEW IF EXISTS public.view_zone_tree_inventory_flow;

CREATE OR REPLACE VIEW public.view_zone_tree_inventory_flow AS
SELECT
    ppt.plot_id AS zone_id,
    sz.name AS zone_name,
    ppt.species_id,
    s.name AS species_name_th,
    ppt.size_label,
    SUM(ppt.planted_count)::int AS planted_count,
    0::int AS digging_qty, -- Placeholder until digging logic is implemented
    0::int AS dugup_qty,   -- Placeholder until dugup logic is implemented
    SUM(ppt.planted_count)::int AS remaining_in_ground, -- Placeholder
    SUM(ppt.planted_count)::int AS available_to_order   -- Placeholder
FROM
    public.planting_plot_trees ppt
JOIN
    public.stock_zones sz ON ppt.plot_id = sz.id
LEFT JOIN
    public.stock_species s ON ppt.species_id = s.id
GROUP BY
    ppt.plot_id, sz.name, ppt.species_id, s.name, ppt.size_label;

GRANT SELECT ON public.view_zone_tree_inventory_flow TO authenticated;

NOTIFY pgrst, 'reload schema';
