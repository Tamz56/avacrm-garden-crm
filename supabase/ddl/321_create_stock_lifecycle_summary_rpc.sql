-- 321_create_stock_lifecycle_summary_rpc.sql

DROP FUNCTION IF EXISTS public.get_stock_lifecycle_summary(text, uuid);

CREATE OR REPLACE FUNCTION public.get_stock_lifecycle_summary(
    p_farm_name  text DEFAULT NULL,
    p_plot_type  uuid DEFAULT NULL
)
RETURNS TABLE (
    total_qty int,              -- เปลี่ยนชื่อให้ตรงกับ Frontend
    available_trees int,
    reserved_trees int,
    dig_ordered_trees int,
    dug_trees int,
    shipped_trees int,
    planted_trees int,
    approx_value numeric
)
LANGUAGE sql
STABLE
AS $$
    WITH lifecycle AS (
        SELECT
            v.*
        FROM public.view_stock_zone_lifecycle v
        WHERE (p_farm_name IS NULL OR v.farm_name = p_farm_name)
          AND (p_plot_type IS NULL OR v.plot_type = p_plot_type)
    )
    SELECT
        COALESCE(SUM(l.tagged_total_qty), 0)::int AS total_qty,
        COALESCE(SUM(l.available_qty), 0)::int   AS available_trees,
        COALESCE(SUM(l.reserved_qty), 0)::int    AS reserved_trees,
        COALESCE(SUM(l.dig_ordered_qty), 0)::int AS dig_ordered_trees,
        COALESCE(SUM(l.dug_qty), 0)::int         AS dug_trees,
        COALESCE(SUM(l.shipped_qty), 0)::int     AS shipped_trees,
        COALESCE(SUM(l.planted_qty), 0)::int     AS planted_trees,
        0::numeric                               AS approx_value
    FROM lifecycle l;
$$;

REVOKE ALL ON FUNCTION public.get_stock_lifecycle_summary(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stock_lifecycle_summary(text, uuid) TO authenticated;
