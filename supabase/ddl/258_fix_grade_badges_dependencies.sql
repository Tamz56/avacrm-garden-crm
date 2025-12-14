-- 258_fix_grade_badges_safe_mode.sql

-- 1. Drop dependent views first (ล้างของเก่าออกก่อน)
DROP VIEW IF EXISTS public.view_stock_species_with_pricing;
DROP VIEW IF EXISTS public.view_stock_species_overview;
DROP VIEW IF EXISTS public.view_stock_zone_lifecycle;

-- 2. สร้าง View หลัก (แบบ Safe Mode: ตัดส่วน Dig Order ที่ Error ออก)
CREATE OR REPLACE VIEW public.view_stock_zone_lifecycle AS
SELECT
    t.zone_id,
    z.name      AS zone_name,
    z.farm_name,
    z.plot_type,

    t.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,
    s.measure_by_height,

    t.size_label,
    i.height_label,
    
    -- ส่วนเกรด (ปรับปรุงจากรอบที่แล้ว)
    g.id AS grade_id,
    g.name_th AS grade_name,
    g.code AS grade_code,

    -- ยอดรวมพื้นฐาน (Basic Stats)
    COUNT(*)::int AS total_qty,
    COUNT(*) FILTER (WHERE t.status = 'available')::int   AS available_qty,
    COUNT(*) FILTER (WHERE t.status = 'reserved')::int    AS reserved_qty,
    COUNT(*) FILTER (WHERE t.status = 'dig_ordered')::int AS dig_ordered_qty,
    COUNT(*) FILTER (WHERE t.status = 'dug')::int         AS dug_qty,
    COUNT(*) FILTER (WHERE t.status = 'shipped')::int     AS shipped_qty,
    COUNT(*) FILTER (WHERE t.status = 'planted')::int     AS planted_qty,
    COUNT(*) FILTER (WHERE t.status = 'available' AND t.tag_code IS NULL)::int AS untagged_qty,

    -- ใส่ค่า 0 ไปก่อนสำหรับส่วนที่ Error (เพื่อไม่ให้ View อื่นพัง)
    0 AS dig_ordered_to_panel_qty,
    0 AS dig_ordered_to_customer_qty,
    0 AS dug_to_panel_qty,
    0 AS dug_to_customer_qty

FROM public.tree_tags t
JOIN public.stock_species s ON s.id = t.species_id
JOIN public.stock_zones   z ON z.id = t.zone_id
LEFT JOIN public.stock_items i ON i.id = t.stock_item_id

-- แก้ไขจุดเชื่อม Grade ให้ใช้ Code แทน ID (จากรอบที่แล้ว)
LEFT JOIN public.stock_tree_grades g ON g.code = t.grade

-- ❌ คอมเมนต์ส่วน Dig Order ที่หาไม่เจอออกไปก่อน
-- LEFT JOIN public.dig_orders d_ord ON d_ord.id = t.dig_order_id

GROUP BY
    t.zone_id,
    z.name,
    z.farm_name,
    z.plot_type,
    t.species_id,
    s.name_th,
    s.name_en,
    s.code,
    s.measure_by_height,
    t.size_label,
    i.height_label,
    g.id,       
    g.name_th,
    g.code
ORDER BY
    s.name_th,
    t.size_label,
    i.height_label,
    g.code,
    z.farm_name,
    z.name;

-- 3. สร้าง View Overview (ไม่ต้องแก้ logic แต่ต้องรันใหม่ให้เชื่อมกัน)
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

    COUNT(DISTINCT m.zone_id)                      AS zone_count,
    ARRAY_AGG(DISTINCT z.name ORDER BY z.name)     AS zone_names,
    ARRAY_AGG(DISTINCT m.zone_id)                  AS zone_ids,

    SUM(m.total_qty)::int                          AS total_qty,
    SUM(m.available_qty)::int                      AS available_qty,
    SUM(m.reserved_qty)::int                       AS reserved_qty,
    SUM(m.dig_ordered_qty)::int                    AS dig_ordered_qty,
    SUM(m.dug_qty)::int                            AS dug_qty,
    SUM(m.shipped_qty)::int                        AS shipped_qty,
    SUM(m.planted_qty)::int                        AS planted_qty,
    SUM(m.untagged_qty)::int                       AS untagged_qty,

    SUM(m.dig_ordered_to_panel_qty)::int           AS dig_ordered_to_panel_qty,
    SUM(m.dig_ordered_to_customer_qty)::int        AS dig_ordered_to_customer_qty,
    SUM(m.dug_to_panel_qty)::int                   AS dug_to_panel_qty,
    SUM(m.dug_to_customer_qty)::int                AS dug_to_customer_qty

FROM public.view_stock_zone_lifecycle m
JOIN public.stock_species s ON s.id = m.species_id
LEFT JOIN public.stock_tree_grades g ON g.id = m.grade_id
LEFT JOIN public.stock_zones z ON z.id = m.zone_id
GROUP BY
    m.species_id,
    s.name_th, s.name_en, s.code,
    m.size_label,
    m.height_label,
    m.grade_id,
    g.name_th, g.code;

-- 4. สร้าง View Pricing (รันต่อให้จบกระบวนการ)
CREATE OR REPLACE VIEW public.view_stock_species_with_pricing AS
SELECT
    s.*, 
    p.line_count,
    p.total_qty_sold,
    p.total_revenue,
    p.avg_price_per_tree,
    p.median_price_per_tree,
    p.min_price_per_tree,
    p.max_price_per_tree,
    p.avg_price_per_meter,
    p.median_price_per_meter,
    p.min_price_per_meter,
    p.max_price_per_meter,
    p.last_price_per_tree,
    p.last_price_per_meter,
    p.last_price_type
FROM public.view_stock_species_overview s
LEFT JOIN public.view_stock_pricing_stats p
 ON p.species_id   = s.species_id
 AND p.size_label   = s.size_label
 AND (
      (s.height_label IS NULL AND p.height_label IS NULL)
      OR s.height_label = p.height_label
 );
