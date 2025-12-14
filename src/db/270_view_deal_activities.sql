CREATE OR REPLACE VIEW public.view_deal_activities AS
SELECT
    a.id,
    a.deal_id,
    a.customer_id,
    a.activity_type,
    a.channel,
    a.summary,
    a.note,
    a.activity_date,
    a.created_at,
    c.name  AS customer_name
FROM public.customer_activities a
LEFT JOIN public.customers c ON c.id = a.customer_id
WHERE a.deal_id IS NOT NULL;
