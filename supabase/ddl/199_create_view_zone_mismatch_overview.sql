-- Drop view if exists
DROP VIEW IF EXISTS view_zone_mismatch_overview;

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
        WHEN inspected_qty_total IS NULL THEN 'ยังไม่สำรวจ'
        WHEN system_qty_total = 0 AND inspected_qty_total = 0 THEN 'ยังไม่ปลูก/บันทึก'
        WHEN diff_qty_total = 0 THEN 'ตรงตามระบบ'
        WHEN ABS(diff_qty_total)::numeric / NULLIF(GREATEST(system_qty_total, 1), 0) <= 0.05 THEN 'คลาดเคลื่อนเล็กน้อย'
        WHEN ABS(diff_qty_total)::numeric / NULLIF(GREATEST(system_qty_total, 1), 0) <= 0.15 THEN 'คลาดเคลื่อนปานกลาง'
        ELSE 'คลาดเคลื่อนมาก'
    END AS mismatch_status

FROM summary;

GRANT SELECT ON view_zone_mismatch_overview TO authenticated;
GRANT SELECT ON view_zone_mismatch_overview TO service_role;
