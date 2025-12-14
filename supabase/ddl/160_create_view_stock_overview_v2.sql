-- 160_create_view_stock_overview_v2.sql

-- View สรุปสต็อกต่อ พันธุ์-ขนาด-โซน-สถานะ
CREATE OR REPLACE VIEW public.view_stock_overview_v2 AS
WITH base AS (
    SELECT
        si.id,
        si.species_id,
        ss.name_th       AS species_name_th,
        ss.name_en       AS species_name_en,
        ss.code          AS species_code,
        si.size_label    AS size_label,       -- ถ้าใน schema จริงใช้ชื่อ column อื่น เช่น size_inch → ปรับตรงนี้
        si.zone_id,
        sz.name          AS zone_name,
        sz.code          AS zone_code,
        si.status        AS stock_status      -- enum: 'available', 'reserved', 'shipped', 'lost' ฯลฯ
    FROM public.stock_items si
    JOIN public.stock_species ss ON ss.id = si.species_id
    LEFT JOIN public.stock_zones sz ON sz.id = si.zone_id
)
SELECT
    species_id,
    species_name_th,
    species_name_en,
    species_code,
    size_label,
    zone_id,
    zone_name,
    zone_code,

    COUNT(*)::int                                         AS total_trees,

    COUNT(*) FILTER (WHERE stock_status = 'available')::int  AS available_trees,
    COUNT(*) FILTER (WHERE stock_status = 'reserved')::int   AS reserved_trees,
    COUNT(*) FILTER (WHERE stock_status = 'shipped')::int    AS shipped_trees,
    COUNT(*) FILTER (
        WHERE stock_status NOT IN ('available','reserved','shipped')
    )::int                                                  AS other_trees
FROM base
GROUP BY
    species_id,
    species_name_th,
    species_name_en,
    species_code,
    size_label,
    zone_id,
    zone_name,
    zone_code;

GRANT SELECT ON public.view_stock_overview_v2 TO authenticated;
NOTIFY pgrst, 'reload schema';
