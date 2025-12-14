-- 179_add_plot_type_to_zones.sql

-- 1. Add column to stock_zones
ALTER TABLE public.stock_zones ADD COLUMN IF NOT EXISTS plot_type text;

-- 2. Update view_stock_overview
CREATE OR REPLACE VIEW public.view_stock_overview AS
SELECT
    i.id AS stock_item_id,
    s.id AS species_id,
    s.code AS species_code,
    s.name AS species_name,
    s.scientific_name,
    s.type AS species_type,
    z.id AS zone_id,
    z.name AS zone_name,
    z.farm_name,
    z.plot_type, -- Added
    i.size_label,
    i.grade,
    i.quantity_available,
    i.quantity_reserved,
    i.base_price,
    i.status
FROM public.stock_items i
JOIN public.stock_species s ON i.species_id = s.id
JOIN public.stock_zones z ON i.zone_id = z.id
WHERE s.is_active = true;

-- 3. Update view_stock_overview_v2
CREATE OR REPLACE VIEW public.view_stock_overview_v2 AS
WITH base AS (
    SELECT
        si.id,
        si.species_id,
        ss.name_th       AS species_name_th,
        ss.name_en       AS species_name_en,
        ss.code          AS species_code,
        si.size_label    AS size_label,
        si.zone_id,
        sz.name          AS zone_name,
        sz.code          AS zone_code,
        sz.plot_type,    -- Added
        si.status        AS stock_status
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
    plot_type, -- Added

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
    zone_code,
    plot_type;

-- 4. Update v_zone_stock_summary
CREATE OR REPLACE VIEW public.v_zone_stock_summary AS
SELECT
    z.id AS zone_id,
    z.name AS zone_name,
    z.plot_type, -- Added
    COUNT(si.id) AS item_count,
    COALESCE(SUM(si.quantity_available + si.quantity_reserved), 0) AS total_trees,
    COALESCE(SUM(si.quantity_available), 0) AS available_trees,
    COALESCE(SUM(si.quantity_reserved), 0) AS reserved_trees,
    0 AS sold_trees
FROM
    public.stock_zones z
LEFT JOIN
    public.stock_items si ON z.id = si.zone_id
GROUP BY
    z.id, z.name, z.plot_type;

GRANT SELECT ON public.view_stock_overview TO authenticated;
GRANT SELECT ON public.view_stock_overview_v2 TO authenticated;
GRANT SELECT ON public.v_zone_stock_summary TO authenticated;

NOTIFY pgrst, 'reload schema';
