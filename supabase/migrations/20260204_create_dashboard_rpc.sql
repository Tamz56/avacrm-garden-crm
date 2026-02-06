-- Create RPC for fetching consolidated billing dashboard summary
-- This function aggregates data on the server side correctly regardless of pagination

CREATE OR REPLACE FUNCTION public.get_billing_dashboard_summary_v1(
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
    v_monthly JSON;
    v_by_type JSON;
    v_top_clients JSON;
    v_outstanding JSON;
BEGIN
    -- 1. KPI Stats (Aggregated)
    SELECT json_build_object(
        'total_docs', COUNT(*),
        'total_revenue', COALESCE(SUM(grand_total), 0),
        'total_paid', COALESCE(SUM(paid_total), 0),
        'total_balance', COALESCE(SUM(balance), 0),
        'count_paid', COUNT(*) FILTER (WHERE payment_state = 'paid'),
        'count_partial', COUNT(*) FILTER (WHERE payment_state = 'partial'),
        'count_unpaid', COUNT(*) FILTER (WHERE payment_state = 'unpaid')
    )
    INTO v_stats
    FROM view_deal_documents_financial
    WHERE status = 'issued'
    AND (p_from_date IS NULL OR doc_date >= p_from_date)
    AND (p_to_date IS NULL OR doc_date <= p_to_date);

    -- 2. Monthly Revenue (Last 6 months or range)
    SELECT json_agg(t)
    INTO v_monthly
    FROM (
        SELECT 
            to_char(doc_date, 'YYYY-MM') as month,
            SUM(grand_total) as revenue,
            COUNT(*) as count
        FROM view_deal_documents_financial
        WHERE status = 'issued'
        AND doc_date >= (CURRENT_DATE - INTERVAL '6 months') -- Default to last 6 months trend
        GROUP BY 1
        ORDER BY 1
    ) t;

    -- 3. Top Customers
    SELECT json_agg(t)
    INTO v_top_clients
    FROM (
        SELECT 
            customer_name as name,
            SUM(grand_total) as amount,
            COUNT(*) as doc_count
        FROM view_deal_documents_financial
        WHERE status = 'issued'
        AND (p_from_date IS NULL OR doc_date >= p_from_date)
        AND (p_to_date IS NULL OR doc_date <= p_to_date)
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 5
    ) t;

    -- 4. Outstanding (Top 5 unpaid)
    SELECT json_agg(t)
    INTO v_outstanding
    FROM (
        SELECT 
            id, doc_no, customer_name, grand_total, balance, doc_date
        FROM view_deal_documents_financial
        WHERE status = 'issued' 
        AND payment_state != 'paid'
        AND balance > 0
        ORDER BY doc_date ASC -- Oldest unpaid first
        LIMIT 5
    ) t;

    RETURN json_build_object(
        'kpi', v_stats,
        'monthly_revenue', COALESCE(v_monthly, '[]'::json),
        'top_customers', COALESCE(v_top_clients, '[]'::json),
        'outstanding', COALESCE(v_outstanding, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_billing_dashboard_summary_v1(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_dashboard_summary_v1(DATE, DATE) TO service_role;
