-- 232_update_view_stock_zone_lifecycle.sql
-- อัพเดท view ให้รวมข้อมูลจาก tree_tags + stock_trees

-- ต้อง DROP ก่อนเพราะ column เปลี่ยน
DROP VIEW IF EXISTS public.view_stock_zone_lifecycle CASCADE;

CREATE OR REPLACE VIEW public.view_stock_zone_lifecycle AS
WITH base AS (
    -- แหล่งที่ 1: tree_tags (ข้อมูลเดิม)
    SELECT
        t.zone_id,
        t.species_id,
        t.size_label,
        t.grade::uuid    AS grade_id,   -- cast text -> uuid
        i.height_label,
        t.status
    FROM public.tree_tags t
    LEFT JOIN public.stock_items i ON i.id = t.stock_item_id

    UNION ALL

    -- แหล่งที่ 2: stock_trees (ต้นที่เพิ่มจากแปลงปลูก)
    SELECT
        st.zone_id,
        st.species_id,
        st.trunk_size::text              AS size_label,
        st.grade_id                      AS grade_id,  -- uuid อยู่แล้ว
        NULL::text                       AS height_label,
        st.status
    FROM public.stock_trees st
    WHERE st.status IS NOT NULL
)
SELECT
    b.zone_id,
    z.name      AS zone_name,
    z.farm_name AS farm_name,
    z.plot_type,

    b.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,
    s.measure_by_height,

    b.size_label,
    b.height_label,
    b.grade_id,
    g.name_th AS grade_name,
    g.code AS grade_code,

    COUNT(*)::int AS total_qty,
    COUNT(*) FILTER (WHERE b.status = 'available')::int   AS available_qty,
    COUNT(*) FILTER (WHERE b.status = 'reserved')::int    AS reserved_qty,
    COUNT(*) FILTER (WHERE b.status = 'dig_ordered')::int AS dig_ordered_qty,
    COUNT(*) FILTER (WHERE b.status = 'dug')::int         AS dug_qty,
    COUNT(*) FILTER (WHERE b.status = 'shipped')::int     AS shipped_qty,
    COUNT(*) FILTER (WHERE b.status = 'planted')::int     AS planted_qty

FROM base b
JOIN public.stock_species s ON s.id = b.species_id
JOIN public.stock_zones   z ON z.id = b.zone_id
LEFT JOIN public.stock_tree_grades g ON g.id = b.grade_id
GROUP BY
    b.zone_id,
    z.name,
    z.farm_name,
    z.plot_type,
    b.species_id,
    s.name_th,
    s.name_en,
    s.code,
    s.measure_by_height,
    b.size_label,
    b.height_label,
    b.grade_id,
    g.name_th,
    g.code
ORDER BY
    s.name_th,
    b.size_label,
    b.height_label,
    g.code,
    z.farm_name,
    z.name;

-- Grant access
GRANT SELECT ON public.view_stock_zone_lifecycle TO authenticated;
GRANT SELECT ON public.view_stock_zone_lifecycle TO service_role;
