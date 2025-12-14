-- 1. Add dig_purpose column to dig_orders
ALTER TABLE public.dig_orders
ADD COLUMN IF NOT EXISTS dig_purpose TEXT DEFAULT 'to_panel';

-- 2. Drop existing view (to avoid column mismatch error)
DROP VIEW IF EXISTS public.view_stock_zone_lifecycle;

-- 3. Recreate view with new columns
CREATE OR REPLACE VIEW public.view_stock_zone_lifecycle AS
SELECT
    -- ✅ ต้องใช้ชื่อเหมือนเดิม
    z.id   AS zone_id,
    z.name AS zone_name,
    z.farm_name,
    z.plot_type,
    t.species_id,
    s.name_th AS species_name_th,
    s.name_en AS species_name_en,
    t.size_label,
    t.grade,

    -- ✅ คอลัมน์ aggregate เดิม
    COALESCE(SUM(t.qty), 0) AS total_qty,
    COALESCE(SUM(CASE WHEN t.status = 'available'   THEN t.qty ELSE 0 END), 0) AS available_qty,
    COALESCE(SUM(CASE WHEN t.status = 'reserved'    THEN t.qty ELSE 0 END), 0) AS reserved_qty,
    COALESCE(SUM(CASE WHEN t.status = 'dig_ordered' THEN t.qty ELSE 0 END), 0) AS dig_ordered_qty,
    COALESCE(SUM(CASE WHEN t.status = 'dug'         THEN t.qty ELSE 0 END), 0) AS dug_qty,
    COALESCE(SUM(CASE WHEN t.status = 'shipped'     THEN t.qty ELSE 0 END), 0) AS shipped_qty,
    COALESCE(SUM(CASE WHEN t.status = 'planted'     THEN t.qty ELSE 0 END), 0) AS planted_qty,

    -- ✅ 4 คอลัมน์ใหม่ แยกตาม dig_purpose (เพิ่มต่อท้าย)
    COALESCE(SUM(
        CASE 
            WHEN t.status = 'dig_ordered' AND o.dig_purpose = 'to_panel' THEN t.qty 
            ELSE 0 
        END
    ), 0) AS dig_ordered_to_panel_qty,

    COALESCE(SUM(
        CASE 
            WHEN t.status = 'dig_ordered' AND o.dig_purpose = 'to_customer' THEN t.qty 
            ELSE 0 
        END
    ), 0) AS dig_ordered_to_customer_qty,

    COALESCE(SUM(
        CASE 
            WHEN t.status = 'dug' AND o.dig_purpose = 'to_panel' THEN t.qty 
            ELSE 0 
        END
    ), 0) AS dug_to_panel_qty,

    COALESCE(SUM(
        CASE 
            WHEN t.status = 'dug' AND o.dig_purpose = 'to_customer' THEN t.qty 
            ELSE 0 
        END
    ), 0) AS dug_to_customer_qty

FROM public.tree_tags t
LEFT JOIN public.stock_zones      z   ON z.id = t.zone_id
LEFT JOIN public.stock_species    s   ON s.id = t.species_id
LEFT JOIN public.dig_order_items  doi ON doi.tag_id = t.id
LEFT JOIN public.dig_orders       o   ON o.id = doi.dig_order_id

GROUP BY
    z.id,
    z.name,
    z.farm_name,
    z.plot_type,
    t.species_id,
    s.name_th,
    s.name_en,
    t.size_label,
    t.grade;
