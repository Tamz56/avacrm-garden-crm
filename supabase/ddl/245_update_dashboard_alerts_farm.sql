DROP VIEW IF EXISTS public.view_dashboard_stock_alerts;

CREATE OR REPLACE VIEW public.view_dashboard_stock_alerts AS
WITH base AS (
    SELECT
        z.id                         AS zone_id,
        z.name                       AS zone_name,
        z.farm_name                  AS farm_name,  -- ✅ เพิ่ม
        NULL::text                   AS species_name_th,
        NULL::text                   AS size_label,
        COALESCE(z.total_tagged, 0)
          + COALESCE(z.total_remaining_for_tag, 0) AS total_qty,
        COALESCE(z.total_tagged, 0)             AS ready_qty,
        COALESCE(z.total_remaining_for_tag, 0)  AS untagged_qty,
        z.inspection_date                       AS last_inspection_date
    FROM public.view_zone_overview z
),

low_stock_candidates AS (
    SELECT
        *,
        ROW_NUMBER() OVER (ORDER BY ready_qty ASC NULLS LAST) AS rn
    FROM base
    WHERE total_qty > 0
      AND ready_qty <= GREATEST(30, total_qty * 0.10)
),
low_stock AS (
    SELECT
        'low_stock'::text AS alert_type,
        zone_id,
        zone_name,
        farm_name,          -- ✅ เพิ่ม
        species_name_th,
        size_label,
        ready_qty,
        total_qty,
        untagged_qty,
        last_inspection_date,
        10 AS priority,
        'Ready เหลือ '
        || ready_qty::text
        || ' ต้น ('
        || COALESCE(ROUND(ready_qty::numeric * 100 / NULLIF(total_qty, 0))::int, 0)::text
        || '% ของทั้งหมด)' AS message
    FROM low_stock_candidates
    WHERE rn = 1
),

high_untagged_candidates AS (
    SELECT
        *,
        (untagged_qty::numeric / NULLIF(total_qty, 0)) AS untagged_ratio,
        ROW_NUMBER() OVER (
            ORDER BY (untagged_qty::numeric / NULLIF(total_qty, 0)) DESC NULLS LAST
        ) AS rn
    FROM base
    WHERE total_qty > 0
      AND untagged_qty > 0
      AND (untagged_qty::numeric / NULLIF(total_qty, 0)) > 0.20
),
high_untagged AS (
    SELECT
        'high_untagged'::text AS alert_type,
        zone_id,
        zone_name,
        farm_name,          -- ✅ เพิ่ม
        species_name_th,
        size_label,
        ready_qty,
        total_qty,
        untagged_qty,
        last_inspection_date,
        20 AS priority,
        'Untagged '
        || untagged_qty::text
        || ' ต้น ('
        || COALESCE(ROUND(untagged_ratio * 100)::int, 0)::text
        || '% ของทั้งหมด)' AS message
    FROM high_untagged_candidates
    WHERE rn = 1
),

inspection_stats AS (
    SELECT
        COUNT(*) FILTER (
            WHERE inspection_date IS NULL
               OR now()::date - inspection_date::date > 90
        ) AS overdue_zones
    FROM public.stock_zones
),
inspection_alert AS (
    SELECT
        'inspection_overdue'::text     AS alert_type,
        NULL::uuid                     AS zone_id,
        NULL::text                     AS zone_name,
        NULL::text                     AS farm_name,       -- ✅ เพิ่ม
        NULL::text                     AS species_name_th,
        NULL::text                     AS size_label,
        NULL::int                      AS ready_qty,
        NULL::int                      AS total_qty,
        NULL::int                      AS untagged_qty,
        NULL::date                     AS last_inspection_date,
        30                             AS priority,
        CASE
            WHEN overdue_zones > 0 THEN
                format('%s zones เกิน 90 วันยังไม่ได้ตรวจ', overdue_zones)
            ELSE NULL
        END AS message
    FROM inspection_stats
)

SELECT * FROM low_stock
UNION ALL
SELECT * FROM high_untagged
UNION ALL
SELECT * FROM inspection_alert
WHERE message IS NOT NULL;
