CREATE OR REPLACE VIEW public.view_customer_360 AS
SELECT
    c.id,
    c.name,
    c.customer_code,
    c.phone,
    c.province,
    c.line_id,
    c.address,
    c.note,
    c.created_at,
    -- 🕒 Creation Month
    date_trunc('month', c.created_at)::date AS created_month,

    -- 🕒 Last Deal Month (for Active Customer filtering)
    date_trunc('month', MAX(d.created_at))::date AS last_deal_month,

    -- 📊 Deal Counts
    COUNT(d.id) AS total_deals,
    COUNT(d.id) FILTER (WHERE d.status::text = 'completed') AS won_deals,
    COUNT(d.id) FILTER (WHERE d.stage::text IN ('lost', 'cancelled')) AS lost_deals,
    COUNT(d.id) FILTER (
        WHERE d.status::text IN ('draft', 'pending', 'confirmed')
          AND d.stage::text NOT IN ('lost', 'cancelled')
    ) AS open_deals,

    -- 💰 Total Revenue (Completed deals only)
    COALESCE(SUM(d.total_amount) FILTER (WHERE d.status::text = 'completed'), 0) AS total_revenue,

    -- 🕒 Last Activity
    MAX(d.updated_at) AS last_deal_activity,

    -- 🏷️ Customer Stage Logic
    CASE
        WHEN COUNT(d.id) FILTER (WHERE d.status::text = 'completed') > 0 THEN 'Won Customer'
        WHEN COUNT(d.id) FILTER (
            WHERE d.status::text IN ('draft', 'pending', 'confirmed')
              AND d.stage::text NOT IN ('lost', 'cancelled')
        ) > 0 THEN 'Pending Decision'
        WHEN COUNT(d.id) FILTER (WHERE d.stage::text IN ('lost', 'cancelled')) > 0 THEN 'Lost / Churn'
        ELSE 'Inquiry / Lead'
    END AS customer_stage,

    -- 🚦 Follow Up Status Logic
    CASE
        WHEN COUNT(d.id) FILTER (
            WHERE d.status::text IN ('draft', 'pending', 'confirmed')
              AND d.stage::text NOT IN ('lost', 'cancelled')
        ) > 0
         AND MAX(d.updated_at) < (NOW() - INTERVAL '7 days')
        THEN 'Overdue'
        ELSE 'On Track'
    END AS follow_up_status

FROM public.customers c
LEFT JOIN public.deals d ON d.customer_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.view_customer_360 TO authenticated, anon, service_role;
