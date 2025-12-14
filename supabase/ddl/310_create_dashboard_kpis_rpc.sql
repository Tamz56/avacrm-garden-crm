-- 310_create_dashboard_kpis_rpc.sql
-- Dashboard KPIs (Ready, Untagged, Open deals, Active dig orders)

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
    p_farm_id uuid DEFAULT NULL,
    p_date_from date DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
    p_date_to   date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    ready_qty                integer,
    ready_species_count      integer,
    ready_zone_count         integer,
    untagged_qty             integer,
    untagged_zone_count      integer,
    open_deals_count         integer,
    open_deals_amount        numeric,
    active_dig_orders_count  integer,
    active_dig_orders_qty    integer
)
LANGUAGE plpgsql
AS $$
DECLARE
BEGIN
    /*
      NOTE: Adapted for actual schema:
      - view_stock_zone_lifecycle: available_qty, untagged_qty
      - deals: total_amount, status IN ('pending', 'confirmed') for open deals
      - dig_orders: status IN ('scheduled'), join dig_order_items for qty
    */

    -- 1. Lifecycle Stats (Ready & Untagged)
    -- Note: view_stock_zone_lifecycle already aggregates by zone/species
    RETURN QUERY
    WITH zone_scope AS (
        SELECT z.id
        FROM public.stock_zones z
        -- WHERE p_farm_id IS NULL OR z.farm_id = p_farm_id -- farm_id column missing in stock_zones
    ),

    lifecycle AS (
        SELECT
            l.zone_id,
            l.species_id,
            COALESCE(l.available_qty, 0) AS available_qty,
            COALESCE(l.untagged_qty, 0)  AS untagged_qty
        FROM public.view_stock_zone_lifecycle l
        JOIN zone_scope zs ON zs.id = l.zone_id
    ),

    lifecycle_agg AS (
        SELECT
            COALESCE(SUM(lc.available_qty), 0)::integer AS ready_qty,
            COUNT(DISTINCT lc.species_id) FILTER (WHERE lc.available_qty > 0)::integer AS ready_species_count,
            COUNT(DISTINCT lc.zone_id)    FILTER (WHERE lc.available_qty > 0)::integer AS ready_zone_count,
            COALESCE(SUM(lc.untagged_qty), 0)::integer AS untagged_qty,
            COUNT(DISTINCT lc.zone_id)    FILTER (WHERE lc.untagged_qty > 0)::integer  AS untagged_zone_count
        FROM lifecycle lc
    ),

    -- 2. Deals Stats (Open Deals)
    deals_scope AS (
        SELECT d.*
        FROM public.deals d
        WHERE d.stage NOT IN ('won', 'lost') -- Open deals are those not won or lost
          -- Optional: Filter by date if needed, but usually "Open Deals" means currently open regardless of creation date
          -- AND (d.created_at::date BETWEEN p_date_from AND p_date_to)
    ),

    deals_agg AS (
        SELECT
            COUNT(*)::integer AS open_deals_count,
            COALESCE(SUM(d.total_amount), 0) AS open_deals_amount -- Changed from amount_total
        FROM deals_scope d
    ),

    -- 3. Dig Orders Stats (Active)
    dig_scope AS (
        SELECT o.id
        FROM public.dig_orders o
        WHERE o.status IN ('scheduled') -- Active dig orders
          -- Optional: Filter by date
          -- AND (o.scheduled_date::date BETWEEN p_date_from AND p_date_to)
    ),

    dig_items AS (
        SELECT
            doi.dig_order_id,
            COUNT(doi.id) as qty -- Count items in the order
        FROM public.dig_order_items doi
        JOIN dig_scope o ON o.id = doi.dig_order_id
        GROUP BY doi.dig_order_id
    ),

    dig_agg AS (
        SELECT
            COUNT(DISTINCT dig_order_id)::integer AS active_dig_orders_count,
            COALESCE(SUM(qty), 0)::integer    AS active_dig_orders_qty
        FROM dig_items
    )

    SELECT
        la.ready_qty,
        la.ready_species_count,
        la.ready_zone_count,
        la.untagged_qty,
        la.untagged_zone_count,
        da.open_deals_count,
        da.open_deals_amount,
        dg.active_dig_orders_count,
        dg.active_dig_orders_qty
    FROM lifecycle_agg la,
         deals_agg     da,
         dig_agg       dg;

END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(uuid, date, date) TO service_role;
