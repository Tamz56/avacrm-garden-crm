-- 312_create_dashboard_tasks_rpc.sql

CREATE OR REPLACE FUNCTION public.get_dashboard_tasks(
    p_date_from date,
    p_date_to   date
)
RETURNS TABLE (
    task_type   text,      -- 'dig_today' | 'ship_today' | 'dig_overdue' | 'zone_inspection'
    title       text,
    subtitle    text,
    badge       text,
    sort_order  integer
)
LANGUAGE sql
AS $$
    -- Dig orders today
    SELECT
        'dig_today'::text AS task_type,
        'Dig orders today'::text AS title,
        CONCAT(
            COUNT(*)::int, ' orders'
            -- We don't have total_trees column easily available without join. 
            -- Let's just show order count for now to be safe, or join view.
            -- view_deal_dig_orders has tags_count.
        ) AS subtitle,
        'Due today'::text AS badge,
        10 AS sort_order
    FROM public.dig_orders d
    WHERE d.status = 'scheduled'
      AND d.scheduled_date = CURRENT_DATE

    UNION ALL

    -- Shipments today
    SELECT
        'ship_today',
        'Shipments today',
        CONCAT(COUNT(*)::int, ' shipments'),
        'Logistics',
        20
    FROM public.deal_shipments s
    WHERE s.status = 'draft' -- Assuming draft means scheduled/pending
      AND s.ship_date = CURRENT_DATE

    UNION ALL

    -- Overdue dig orders
    SELECT
        'dig_overdue',
        'Overdue dig orders',
        CONCAT(COUNT(*)::int, ' orders'),
        'Overdue',
        30
    FROM public.dig_orders d
    WHERE d.status = 'scheduled'
      AND d.scheduled_date < CURRENT_DATE

    UNION ALL

    -- Zones need inspection
    SELECT
        'zone_inspection',
        'Zones need inspection',
        CONCAT(COUNT(*)::int, ' zones'),
        'Inspection',
        40
    FROM public.stock_zones z
    WHERE (z.inspection_date IS NULL
           OR z.inspection_date < CURRENT_DATE - INTERVAL '90 days')
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_tasks(date, date)
TO authenticated;

NOTIFY pgrst, 'reload schema';
