-- 147_commission_payout_backend.sql
-- RPCs for Commission Payout Tab

-- 1. Get Commission Payout Summary for a specific month
-- Month format: 'YYYY-MM' (e.g., '2023-11')
-- Based on Deal Created Date (or Closing Date? Using Created Date for consistency with other reports)

CREATE OR REPLACE FUNCTION public.get_commission_payout_summary(
    p_month_str TEXT
)
RETURNS TABLE (
    total_deals BIGINT,
    total_commission NUMERIC(12,2),
    total_paid NUMERIC(12,2),
    total_unpaid NUMERIC(12,2),
    sales_person_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT
            dc.id,
            dc.commission_amount,
            dc.paid_amount,
            dc.profile_id
        FROM public.deal_commissions dc
        JOIN public.deals d ON d.id = dc.deal_id
        WHERE TO_CHAR(d.created_at, 'YYYY-MM') = p_month_str
          AND d.deleted_at IS NULL
    )
    SELECT
        COUNT(DISTINCT id) AS total_deals, -- Actually count of commission records? No, user wants "Deals Count". But one deal can have multiple commissions.
        -- Let's count unique deals involved?
        -- But the query above selects deal_commissions.
        -- If we want "Total Deals" in the summary card, maybe we mean "Number of Deals that generated commission".
        -- Let's stick to simple count of commissions for now, or count distinct deal_id if we joined.
        -- Wait, the requirement says "Sales Count" in summary card.
        -- Let's return count of distinct deals.
        (SELECT COUNT(DISTINCT deal_id) FROM public.deal_commissions dc JOIN public.deals d ON d.id = dc.deal_id WHERE TO_CHAR(d.created_at, 'YYYY-MM') = p_month_str) AS total_deals,
        
        COALESCE(SUM(commission_amount), 0) AS total_commission,
        COALESCE(SUM(paid_amount), 0) AS total_paid,
        COALESCE(SUM(commission_amount) - SUM(paid_amount), 0) AS total_unpaid,
        COUNT(DISTINCT profile_id) AS sales_person_count
    FROM monthly_data;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_payout_summary(TEXT) TO anon, authenticated, service_role;


-- 2. Get Commission Payout By Person for a specific month
CREATE OR REPLACE FUNCTION public.get_commission_payout_by_person(
    p_month_str TEXT
)
RETURNS TABLE (
    sales_person_id UUID,
    full_name TEXT,
    role TEXT, -- We might have multiple roles for one person. We'll pick one or aggregate.
    total_deals BIGINT,
    total_commission NUMERIC(12,2),
    total_paid NUMERIC(12,2),
    total_unpaid NUMERIC(12,2),
    status TEXT -- 'PAID', 'PARTIAL', 'UNPAID'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.profile_id AS sales_person_id,
        COALESCE(p.full_name, 'Unknown') AS full_name,
        -- Role: Just take the most frequent or first one? Or 'Mixed'?
        -- Let's try to get the role from the profile if possible, or just 'Sales'.
        -- But deal_commissions has `role` column (referral, sales, leader).
        -- A person can be referral in one deal and sales in another.
        -- Let's aggregate roles: e.g. "Sales, Referral"
        STRING_AGG(DISTINCT dc.role, ', ') AS role,
        
        COUNT(DISTINCT dc.deal_id) AS total_deals,
        SUM(dc.commission_amount) AS total_commission,
        SUM(dc.paid_amount) AS total_paid,
        SUM(dc.commission_amount) - SUM(dc.paid_amount) AS total_unpaid,
        
        CASE
            WHEN SUM(dc.paid_amount) >= SUM(dc.commission_amount) THEN 'PAID'
            WHEN SUM(dc.paid_amount) > 0 THEN 'PARTIAL'
            ELSE 'UNPAID'
        END AS status
    FROM public.deal_commissions dc
    JOIN public.deals d ON d.id = dc.deal_id
    LEFT JOIN public.profiles p ON p.id = dc.profile_id
    WHERE TO_CHAR(d.created_at, 'YYYY-MM') = p_month_str
      AND d.deleted_at IS NULL
    GROUP BY dc.profile_id, p.full_name
    ORDER BY total_commission DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_payout_by_person(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
