-- 159_create_get_logistics_kpis_fn.sql

CREATE OR REPLACE FUNCTION public.get_logistics_kpis(
  _date_from date,
  _date_to   date
)
RETURNS TABLE (
  total_shipments        integer,
  total_distance_km      numeric,
  total_cost             numeric,
  avg_cost_per_shipment  numeric,
  avg_cost_per_km        numeric,
  total_trees            numeric,
  avg_cost_per_tree      numeric
)
LANGUAGE plpgsql
AS $func$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ds.id) AS total_shipments,
    COALESCE(SUM(ds.distance_km), 0)::numeric AS total_distance_km,
    COALESCE(SUM(
      COALESCE(ds.final_price, ds.estimated_price, 0)
    ), 0)::numeric AS total_cost,
    CASE
      WHEN COUNT(DISTINCT ds.id) > 0
        THEN COALESCE(SUM(COALESCE(ds.final_price, ds.estimated_price, 0)), 0)
             / COUNT(DISTINCT ds.id)
      ELSE 0
    END AS avg_cost_per_shipment,
    CASE
      WHEN COALESCE(SUM(ds.distance_km), 0) > 0
        THEN COALESCE(SUM(COALESCE(ds.final_price, ds.estimated_price, 0)), 0)
             / COALESCE(SUM(ds.distance_km), 0)
      ELSE 0
    END AS avg_cost_per_km,
    COALESCE(SUM(dsi.quantity), 0)::numeric AS total_trees,
    CASE
      WHEN COALESCE(SUM(dsi.quantity), 0) > 0
        THEN COALESCE(SUM(COALESCE(ds.final_price, ds.estimated_price, 0)), 0)
             / COALESCE(SUM(dsi.quantity), 0)
      ELSE 0
    END AS avg_cost_per_tree
  FROM public.deal_shipments ds
  LEFT JOIN public.deal_shipment_items dsi
    ON dsi.shipment_id = ds.id
  WHERE ds.status = 'completed'
    AND ds.ship_date >= _date_from
    AND ds.ship_date <  _date_to;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_logistics_kpis(date, date) TO authenticated;
NOTIFY pgrst, 'reload schema';
