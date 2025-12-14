DROP FUNCTION IF EXISTS public.get_stock_monthly_summary(INT, INT);

CREATE OR REPLACE FUNCTION public.get_stock_monthly_summary(
    p_year  INT,
    p_month INT
)
RETURNS TABLE (
    species_id   UUID,
    species_name_th TEXT,
    size_label   TEXT,
    zone_id      UUID,
    zone_name    TEXT,
    opening_qty  INTEGER,
    in_qty       INTEGER,
    out_qty      INTEGER,
    closing_qty  INTEGER
)
LANGUAGE sql
AS $fn$
WITH params AS (
    SELECT
        make_date(p_year, p_month, 1)::date AS start_date,
        (make_date(p_year, p_month, 1) + INTERVAL '1 month')::date AS end_date
),
opening AS (
    SELECT
        t.species_id,
        t.size_label,
        t.zone_id,
        COUNT(*) AS opening_qty
    FROM public.tree_tags t
    CROSS JOIN params p
    WHERE
        -- เข้าสต็อกแล้ว ก่อนเริ่มเดือน
        t.stock_in_date < p.start_date
        -- และยังไม่ออก หรือออกหลังต้นเดือน
        AND (t.stock_out_date IS NULL OR t.stock_out_date >= p.start_date)
    GROUP BY t.species_id, t.size_label, t.zone_id
),
in_month AS (
    SELECT
        t.species_id,
        t.size_label,
        t.zone_id,
        COUNT(*) AS in_qty
    FROM public.tree_tags t
    CROSS JOIN params p
    WHERE
        t.stock_in_date >= p.start_date
        AND t.stock_in_date < p.end_date
    GROUP BY t.species_id, t.size_label, t.zone_id
),
out_month AS (
    SELECT
        t.species_id,
        t.size_label,
        t.zone_id,
        COUNT(*) AS out_qty
    FROM public.tree_tags t
    CROSS JOIN params p
    WHERE
        t.stock_out_date IS NOT NULL
        AND t.stock_out_date >= p.start_date
        AND t.stock_out_date < p.end_date
    GROUP BY t.species_id, t.size_label, t.zone_id
),
merged AS (
    SELECT
        COALESCE(o.species_id, i.species_id, u.species_id) AS species_id,
        COALESCE(o.size_label, i.size_label, u.size_label) AS size_label,
        COALESCE(o.zone_id, i.zone_id, u.zone_id)         AS zone_id,
        COALESCE(o.opening_qty, 0) AS opening_qty,
        COALESCE(i.in_qty, 0)      AS in_qty,
        COALESCE(u.out_qty, 0)     AS out_qty
    FROM opening o
    FULL JOIN in_month  i
        ON  o.species_id = i.species_id
        AND o.size_label = i.size_label
        AND o.zone_id    = i.zone_id
    FULL JOIN out_month u
        ON  COALESCE(o.species_id, i.species_id) = u.species_id
        AND COALESCE(o.size_label, i.size_label) = u.size_label
        AND COALESCE(o.zone_id, i.zone_id)       = u.zone_id
)
SELECT
    m.species_id,
    s.name_th AS species_name_th,
    m.size_label,
    m.zone_id,
    z.name    AS zone_name,
    m.opening_qty,
    m.in_qty,
    m.out_qty,
    (m.opening_qty + m.in_qty - m.out_qty) AS closing_qty
FROM merged m
LEFT JOIN public.stock_species s ON s.id = m.species_id
LEFT JOIN public.stock_zones   z ON z.id = m.zone_id
ORDER BY
    s.name_th,
    m.size_label,
    z.name;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_stock_monthly_summary(INT, INT)
TO authenticated;
