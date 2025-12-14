CREATE OR REPLACE VIEW public.view_zone_utilization AS
SELECT
    z.id              AS zone_id,
    z.code            AS zone_code,
    z.name            AS zone_name,
    z.farm_name,
    z.area_rai,
    z.area_width_m,
    z.area_length_m,
    z.planting_rows,
    z.is_active,

    COUNT(si.id)::int AS total_trees,

    COUNT(si.id) FILTER (WHERE si.status::text = 'available')::int AS available_trees,
    COUNT(si.id) FILTER (WHERE si.status::text = 'reserved')::int  AS reserved_trees,
    COUNT(si.id) FILTER (WHERE si.status::text = 'shipped')::int   AS shipped_trees,

    CASE 
        WHEN z.area_rai IS NOT NULL AND z.area_rai > 0
        THEN ROUND(COUNT(si.id)::numeric / z.area_rai, 2)
        ELSE NULL
    END AS trees_per_rai
FROM public.stock_zones z
LEFT JOIN public.stock_items si ON si.zone_id = z.id
GROUP BY
    z.id,
    z.code,
    z.name,
    z.farm_name,
    z.area_rai,
    z.area_width_m,
    z.area_length_m,
    z.planting_rows,
    z.is_active;

GRANT SELECT ON public.view_zone_utilization TO authenticated;
NOTIFY pgrst, 'reload schema';
