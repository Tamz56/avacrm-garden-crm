-- 255_view_stock_species_overview.sql

CREATE OR REPLACE VIEW public.view_stock_species_overview AS
SELECT
    m.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,

    m.size_label,
    m.height_label,
    m.grade_id,
    g.name_th   AS grade_name_th,
    g.code      AS grade_code,

    -- จำนวนโซนที่มีต้นชุดนี้
    COUNT(DISTINCT m.zone_id)                      AS zone_count,
    ARRAY_AGG(DISTINCT z.name ORDER BY z.name)     AS zone_names,
    ARRAY_AGG(DISTINCT m.zone_id)                  AS zone_ids,

    -- รวมยอดจำนวนต้น (ทุกโซน)
    SUM(m.total_qty)::int                          AS total_qty,
    SUM(m.available_qty)::int                      AS available_qty,
    SUM(m.reserved_qty)::int                       AS reserved_qty,
    SUM(m.dig_ordered_qty)::int                    AS dig_ordered_qty,
    SUM(m.dug_qty)::int                            AS dug_qty,
    SUM(m.shipped_qty)::int                        AS shipped_qty,
    SUM(m.planted_qty)::int                        AS planted_qty,
    SUM(m.untagged_qty)::int                       AS untagged_qty,

    -- รวมยอดแบ่งตาม purpose
    SUM(m.dig_ordered_to_panel_qty)::int           AS dig_ordered_to_panel_qty,
    SUM(m.dig_ordered_to_customer_qty)::int        AS dig_ordered_to_customer_qty,
    SUM(m.dug_to_panel_qty)::int                   AS dug_to_panel_qty,
    SUM(m.dug_to_customer_qty)::int                AS dug_to_customer_qty

FROM public.view_stock_zone_lifecycle m
JOIN public.stock_species s
  ON s.id = m.species_id
LEFT JOIN public.stock_tree_grades g
  ON g.id = m.grade_id
LEFT JOIN public.stock_zones z
  ON z.id = m.zone_id
GROUP BY
    m.species_id,
    s.name_th, s.name_en, s.code,
    m.size_label,
    m.height_label,
    m.grade_id,
    g.name_th, g.code;
