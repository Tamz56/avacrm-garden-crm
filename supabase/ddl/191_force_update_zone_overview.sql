-- 191_force_update_zone_overview.sql

-- Ensure planting_plot_detail_lookup exists (Dependency for the view)
CREATE TABLE IF NOT EXISTS public.planting_plot_detail_lookup (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL,
    name_th text NOT NULL,
    sort_order int DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Insert default values if table is empty
INSERT INTO public.planting_plot_detail_lookup (code, name_th, sort_order)
SELECT 'PRODUCTION', 'แปลงผลิตจริง (PRODUCTION)', 1
WHERE NOT EXISTS (SELECT 1 FROM public.planting_plot_detail_lookup WHERE code = 'PRODUCTION');

INSERT INTO public.planting_plot_detail_lookup (code, name_th, sort_order)
SELECT 'TEST', 'แปลงทดลอง (TEST)', 2
WHERE NOT EXISTS (SELECT 1 FROM public.planting_plot_detail_lookup WHERE code = 'TEST');

INSERT INTO public.planting_plot_detail_lookup (code, name_th, sort_order)
SELECT 'NURSERY', 'แปลง nursery (NURSERY)', 3
WHERE NOT EXISTS (SELECT 1 FROM public.planting_plot_detail_lookup WHERE code = 'NURSERY');

-- User provided View Definition
DROP VIEW IF EXISTS public.view_zone_overview;

CREATE VIEW public.view_zone_overview AS
WITH zone_tree AS (
    SELECT
        z.id AS zone_id,
        st.planted_qty,
        st.dugup_qty,
        st.remaining_qty
    FROM public.stock_zones z
    LEFT JOIN public.planting_plots p
        ON p.zone_id = z.id
    LEFT JOIN public.planting_plot_trees ppt
        ON ppt.plot_id = p.id
    LEFT JOIN public.view_planting_plot_tree_status st
        ON st.planting_plot_tree_id = ppt.id
),
tree_totals AS (
    SELECT
        zone_id,
        COALESCE(SUM(planted_qty), 0)   AS total_planted_qty,
        COALESCE(SUM(dugup_qty), 0)     AS total_digup_qty,
        COALESCE(SUM(remaining_qty), 0) AS total_remaining_qty
    FROM zone_tree
    GROUP BY zone_id
)
SELECT
    z.id,
    z.name,
    z.farm_name,
    z.farm_name AS location_name,
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
    z.inspection_date      AS last_inspection_date,
    z.inspection_date,
    z.inspection_trunk_inch,
    z.inspection_height_m,
    z.inspection_pot_inch,
    z.inspection_notes,
    z.created_at,

    COALESCE(tt.total_planted_qty, 0)   AS total_planted_qty,
    COALESCE(tt.total_digup_qty, 0)     AS total_digup_qty,
    COALESCE(tt.total_remaining_qty, 0) AS total_remaining_qty
FROM public.stock_zones z
LEFT JOIN tree_totals tt
    ON tt.zone_id = z.id
LEFT JOIN public.planting_plot_detail_lookup l
    ON l.id = z.plot_type;

GRANT SELECT ON public.view_zone_overview TO authenticated;
NOTIFY pgrst, 'reload schema';
