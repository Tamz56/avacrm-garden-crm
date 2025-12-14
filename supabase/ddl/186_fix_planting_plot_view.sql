-- 186_fix_planting_plot_view.sql

-- 1. Drop the view that depends on the status view (and to allow schema changes)
DROP VIEW IF EXISTS public.view_planting_plot_detail;

-- 2. Create status view
CREATE OR REPLACE VIEW public.view_planting_plot_tree_status AS
WITH digup AS (
    SELECT
        planting_plot_tree_id,
        SUM(quantity) AS total_digup_qty
    FROM public.digup_batches
    WHERE status != 'cancelled'
    GROUP BY planting_plot_tree_id
)
SELECT
    ppt.id AS planting_plot_tree_id,
    ppt.planted_count AS planted_qty,
    COALESCE(digup.total_digup_qty, 0) AS dugup_qty,
    GREATEST(
        ppt.planted_count - COALESCE(digup.total_digup_qty, 0),
        0
    ) AS remaining_qty
FROM public.planting_plot_trees ppt
LEFT JOIN digup
    ON digup.planting_plot_tree_id = ppt.id;

-- 3. Re-create detail view (User provided definition)
CREATE OR REPLACE VIEW public.view_planting_plot_detail AS
SELECT
    ppt.id AS plot_tree_id,
    ppt.plot_id,
    ppt.species_id,
    s.name AS species_name_th,
    s.name AS species_name_en,          -- ✅ ใช้ name เดียวกันไปก่อน
    ppt.size_label,

    st.planted_qty AS planted_count,
    st.dugup_qty,
    st.remaining_qty AS remaining_in_plot,

    ppt.planted_date,
    ppt.note
FROM public.planting_plot_trees ppt
LEFT JOIN public.stock_species s
    ON ppt.species_id = s.id
LEFT JOIN public.view_planting_plot_tree_status st
    ON st.planting_plot_tree_id = ppt.id;

GRANT SELECT ON public.view_planting_plot_tree_status TO authenticated;
GRANT SELECT ON public.view_planting_plot_detail TO authenticated;

NOTIFY pgrst, 'reload schema';
