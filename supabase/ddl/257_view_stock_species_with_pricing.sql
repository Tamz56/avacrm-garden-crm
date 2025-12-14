-- 257_view_stock_species_with_pricing.sql

DROP VIEW IF EXISTS public.view_stock_species_with_pricing;

CREATE OR REPLACE VIEW public.view_stock_species_with_pricing AS
SELECT
    s.*,   -- All columns from view_stock_species_overview

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
 -- Match by height_label if applicable
 AND (
      (s.height_label IS NULL AND p.height_label IS NULL)
      OR s.height_label = p.height_label
 );
