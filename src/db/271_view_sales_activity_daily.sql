CREATE OR REPLACE VIEW public.view_sales_activity_daily AS
SELECT
    date_trunc('day', activity_date) AS activity_day,
    created_by,
    COUNT(*) AS total_activities,
    COUNT(*) FILTER (WHERE activity_type = 'call')     AS total_calls,
    COUNT(*) FILTER (WHERE activity_type = 'followup') AS total_followups,
    COUNT(*) FILTER (WHERE activity_type = 'meeting')  AS total_meetings,
    COUNT(DISTINCT customer_id)                        AS customers_touched,
    COUNT(DISTINCT deal_id)                            AS deals_touched
FROM public.customer_activities
GROUP BY activity_day, created_by
ORDER BY activity_day DESC;
