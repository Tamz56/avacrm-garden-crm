-- 192_fix_zone_overview_totals.sql

-- ลบ view เดิมก่อน (แต่ยังเก็บโครงคอลัมน์เดิมไว้)
DROP VIEW IF EXISTS public.view_zone_overview;

CREATE OR REPLACE VIEW public.view_zone_overview AS
WITH zone_tree_agg AS (
    -- รวมยอดตาม "โซน" ให้ถูกต้อง:
    -- planting_plot_trees -> planting_plots (มี zone_id) -> stock_zones
    SELECT
        p.zone_id,
        SUM(st.planted_qty)    AS planted_qty,
        SUM(st.dugup_qty)      AS dugup_qty,
        SUM(st.remaining_qty)  AS remaining_qty
    FROM public.planting_plot_trees ppt
    JOIN public.planting_plots p
        ON p.id = ppt.plot_id
    JOIN public.view_planting_plot_tree_status st
        ON st.planting_plot_tree_id = ppt.id
    GROUP BY p.zone_id
)
SELECT
    z.id,
    z.name,
    z.farm_name,
    z.farm_name AS location_name,   -- alias ให้ frontend เดิม

    z.description,
    z.plot_type,
    l.code    AS plot_type_code,
    l.name_th AS plot_type_name,

    z.area_rai,
    z.area_width_m,
    z.area_length_m,
    z.planting_rows,
    z.pump_size_hp,
    z.water_source,
    z.inspection_date        AS last_inspection_date,
    z.inspection_date,
    z.inspection_trunk_inch,
    z.inspection_height_m,
    z.inspection_pot_inch,
    z.inspection_notes,
    z.created_at,

    COALESCE(agg.planted_qty,   0) AS total_planted_qty,
    COALESCE(agg.dugup_qty,     0) AS total_digup_qty,
    COALESCE(agg.remaining_qty, 0) AS total_remaining_qty

FROM public.stock_zones z
LEFT JOIN public.planting_plot_detail_lookup l
    ON l.id = z.plot_type
LEFT JOIN zone_tree_agg agg
    ON agg.zone_id = z.id;

GRANT SELECT ON public.view_zone_overview TO authenticated;
NOTIFY pgrst, 'reload schema';
