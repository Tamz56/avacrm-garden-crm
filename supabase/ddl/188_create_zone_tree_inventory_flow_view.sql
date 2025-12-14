-- 188_create_zone_tree_inventory_flow_view.sql

-- ลบของเดิมก่อน
DROP VIEW IF EXISTS public.view_zone_tree_inventory_flow;

-- View: รายการต้นไม้ในแปลงต่อโซน (สำหรับตารางกลาง)
CREATE VIEW public.view_zone_tree_inventory_flow AS
SELECT
    z.id          AS zone_id,
    z.id          AS planting_plot_id, -- In this schema, zone IS the plot
    ppt.id        AS plot_tree_id,

    ppt.species_id,
    s.name        AS species_name_th,
    s.name        AS species_name_en,
    ppt.size_label,

    st.planted_qty    AS planted_count,
    st.dugup_qty,
    st.remaining_qty  AS remaining_in_ground,
    st.remaining_qty  AS available_to_order   -- ตอนนี้ให้เท่ากันไปก่อน

FROM public.planting_plot_trees ppt
JOIN public.stock_zones z
    ON ppt.plot_id = z.id -- Direct join to stock_zones
LEFT JOIN public.stock_species s
    ON ppt.species_id = s.id
LEFT JOIN public.view_planting_plot_tree_status st
    ON st.planting_plot_tree_id = ppt.id;

GRANT SELECT ON public.view_zone_tree_inventory_flow TO authenticated;
NOTIFY pgrst, 'reload schema';
