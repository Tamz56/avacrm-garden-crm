-- 256_view_stock_pricing_stats.sql

DROP VIEW IF EXISTS public.view_stock_pricing_stats CASCADE;

CREATE OR REPLACE VIEW public.view_stock_pricing_stats AS
WITH base AS (
    SELECT
        si.species_id,
        si.size_label,

        -- Convert height to readable label, e.g., "6 m."
        CASE
            WHEN di.height_m IS NULL THEN NULL
            ELSE TRIM(TO_CHAR(di.height_m, 'FM999G999D0')) || ' ม.'
        END AS height_label,

        di.price_type,          -- 'per_tree' or 'per_meter'
        di.quantity,
        di.line_total,
        d.created_at,

        -- Price per tree (normalize from line_total / quantity)
        CASE
            WHEN di.quantity > 0
            THEN (di.line_total / di.quantity)::numeric
            ELSE NULL
        END AS price_per_tree,

        -- Price per meter (normalize from line_total / (quantity * height_m))
        CASE
            WHEN di.height_m IS NOT NULL AND di.height_m > 0 AND di.quantity > 0
            THEN (di.line_total / (di.quantity * di.height_m))::numeric
            ELSE NULL
        END AS price_per_meter

    FROM public.deal_items di
    JOIN public.deals d
      ON d.id = di.deal_id
    JOIN public.stock_items si
      ON si.id = di.stock_item_id

    -- Use only "won" deals and paid/partial status
    WHERE d.stage = 'won'
      AND COALESCE(d.payment_status, 'paid') IN ('paid', 'partial')
)
SELECT
    species_id,
    size_label,
    height_label,

    COUNT(*)                      AS line_count,         -- Number of deal items
    SUM(quantity)::int            AS total_qty_sold,     -- Total quantity sold
    SUM(line_total)               AS total_revenue,      -- Total revenue

    -- Price per tree
    AVG(price_per_tree)                          AS avg_price_per_tree,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY price_per_tree
    )                                            AS median_price_per_tree,
    MIN(price_per_tree)                          AS min_price_per_tree,
    MAX(price_per_tree)                          AS max_price_per_tree,

    -- Price per meter
    AVG(price_per_meter)                         AS avg_price_per_meter,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY price_per_meter
    )                                            AS median_price_per_meter,
    MIN(price_per_meter)                         AS min_price_per_meter,
    MAX(price_per_meter)                         AS max_price_per_meter,

    -- Last price (from most recent deal)
    (ARRAY_AGG(price_per_tree  ORDER BY created_at DESC))[1] AS last_price_per_tree,
    (ARRAY_AGG(price_per_meter ORDER BY created_at DESC))[1] AS last_price_per_meter,
    (ARRAY_AGG(price_type      ORDER BY created_at DESC))[1] AS last_price_type

FROM base
GROUP BY
    species_id,
    size_label,
    height_label;
