-- 202_fix_mismatch_views.sql

-- 1. Drop the base view with CASCADE to automatically remove all dependent views
-- This ensures we have a clean slate regardless of the current dependency structure
DROP VIEW IF EXISTS public.view_zone_tree_stock_vs_inspection CASCADE;

-- Also drop these explicitly just in case they were not linked (though CASCADE should handle it if they were)
DROP VIEW IF EXISTS public.view_zone_mismatch_overview CASCADE;
DROP VIEW IF EXISTS public.view_zone_stock_vs_inspection_summary CASCADE;


-- 2. Create Detailed View (New)
CREATE VIEW public.view_zone_tree_stock_vs_inspection AS
WITH system_stock AS (
    SELECT
        zone_id,
        species_id,
        species_name_th, -- Include Name
        size_label,
        SUM(remaining_in_ground) AS system_qty
    FROM public.view_zone_tree_inventory_flow
    GROUP BY zone_id, species_id, species_name_th, size_label
),
inspection_stock AS (
    SELECT
        zone_id,
        species_id,
        species_name_th, -- Include Name
        size_label,
        total_estimated_qty AS inspected_qty,
        last_inspection_date
    FROM public.view_zone_tree_inspection_summary
)
SELECT
    COALESCE(s.zone_id, i.zone_id) AS zone_id,
    COALESCE(s.species_id, i.species_id) AS species_id,
    COALESCE(s.species_name_th, i.species_name_th) AS species_name_th, -- Coalesce Name
    COALESCE(s.size_label, i.size_label) AS size_label,
    
    COALESCE(s.system_qty, 0) AS system_qty,
    COALESCE(i.inspected_qty, 0) AS inspected_qty,
    
    (COALESCE(i.inspected_qty, 0) - COALESCE(s.system_qty, 0)) AS diff_qty,
    
    i.last_inspection_date

FROM system_stock s
FULL OUTER JOIN inspection_stock i
    ON s.zone_id = i.zone_id
    AND s.species_id = i.species_id
    AND COALESCE(s.size_label, '') = COALESCE(i.size_label, '');

GRANT SELECT ON public.view_zone_tree_stock_vs_inspection TO authenticated;
GRANT SELECT ON public.view_zone_tree_stock_vs_inspection TO service_role;

-- 3. Recreate Summary View (Original definition from 200_recreate_zone_stock_vs_inspection_summary.sql)
CREATE VIEW view_zone_stock_vs_inspection_summary AS
WITH system_stock AS (
    SELECT 
        zone_id,
        SUM(remaining_in_ground) as system_qty_total
    FROM view_zone_tree_inventory_flow
    GROUP BY zone_id
),
inspected_stock AS (
    SELECT 
        zone_id,
        SUM(total_estimated_qty) as inspected_qty_total,
        MAX(last_inspection_date) as last_inspection_date
    FROM view_zone_tree_inspection_summary
    GROUP BY zone_id
)
SELECT 
    z.id as zone_id,
    z.name as zone_name,
    z.farm_name,
    COALESCE(s.system_qty_total, 0) as system_qty_total,
    COALESCE(i.inspected_qty_total, 0) as inspected_qty_total,
    COALESCE(i.inspected_qty_total, 0) - COALESCE(s.system_qty_total, 0) as diff_qty_total,
    ABS(COALESCE(i.inspected_qty_total, 0) - COALESCE(s.system_qty_total, 0)) as max_abs_diff,
    i.last_inspection_date
FROM stock_zones z
LEFT JOIN system_stock s ON z.id = s.zone_id
LEFT JOIN inspected_stock i ON z.id = i.zone_id;

GRANT SELECT ON view_zone_stock_vs_inspection_summary TO authenticated;
GRANT SELECT ON view_zone_stock_vs_inspection_summary TO service_role;

-- 4. Recreate Mismatch Overview (Original definition from 200_recreate_zone_stock_vs_inspection_summary.sql)
CREATE VIEW view_zone_mismatch_overview AS
WITH summary AS (
    SELECT * FROM view_zone_stock_vs_inspection_summary
)
SELECT
    zone_id,
    zone_name,
    system_qty_total AS system_qty,
    inspected_qty_total AS inspected_qty,
    diff_qty_total AS diff_qty,
    ABS(diff_qty_total) AS diff_abs,
    last_inspection_date,
    
    -- Diff Direction
    CASE
        WHEN diff_qty_total > 0 THEN 'สำรวจมากกว่าระบบ (เกิน)'
        WHEN diff_qty_total < 0 THEN 'ระบบมากกว่าสำรวจ (ขาด)'
        ELSE 'ตรงกัน'
    END AS diff_direction,

    -- Mismatch Status
    CASE
        WHEN inspected_qty_total IS NULL OR last_inspection_date IS NULL THEN 'ยังไม่สำรวจ'
        WHEN system_qty_total = 0 AND inspected_qty_total = 0 THEN 'ยังไม่ปลูก/บันทึก'
        WHEN diff_qty_total = 0 THEN 'ตรงตามระบบ'
        WHEN ABS(diff_qty_total)::numeric / NULLIF(GREATEST(system_qty_total, 1), 0) <= 0.05 THEN 'คลาดเคลื่อนเล็กน้อย'
        WHEN ABS(diff_qty_total)::numeric / NULLIF(GREATEST(system_qty_total, 1), 0) <= 0.15 THEN 'คลาดเคลื่อนปานกลาง'
        ELSE 'คลาดเคลื่อนมาก'
    END AS mismatch_status

FROM summary;

GRANT SELECT ON view_zone_mismatch_overview TO authenticated;
GRANT SELECT ON view_zone_mismatch_overview TO service_role;
