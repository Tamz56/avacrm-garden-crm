-- Recreate the summary view to include last_inspection_date
CREATE OR REPLACE VIEW view_zone_stock_vs_inspection_summary AS
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
FROM planting_plots z
LEFT JOIN system_stock s ON z.id = s.zone_id
LEFT JOIN inspected_stock i ON z.id = i.zone_id;

GRANT SELECT ON view_zone_stock_vs_inspection_summary TO authenticated;
GRANT SELECT ON view_zone_stock_vs_inspection_summary TO service_role;

-- Now recreate the mismatch overview view (dependent)
CREATE OR REPLACE VIEW view_zone_mismatch_overview AS
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
