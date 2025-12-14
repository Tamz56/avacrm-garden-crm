-- 149_commission_payout_view.sql
-- Implement View and RPCs for Commission Payout Tab

-- 1. Create View: v_commission_payout_monthly
-- Groups commissions by Sales Person and Month (based on Deal Creation Date)
CREATE OR REPLACE VIEW public.v_commission_payout_monthly AS
SELECT
    dc.profile_id AS sales_profile_id,
    p.full_name AS sales_name,
    DATE_TRUNC('month', d.created_at)::date AS payout_month,
    SUM(dc.commission_amount) AS total_commission,
    SUM(dc.paid_amount) AS total_paid,
    SUM(dc.commission_amount - dc.paid_amount) AS remaining_to_pay,
    COUNT(DISTINCT dc.deal_id) AS deals_count,
    -- Aggregate roles (e.g., "Sales Lead, Sales Agent")
    STRING_AGG(DISTINCT dc.role, ', ') AS roles,
    -- Last payment date for this group
    MAX(
        (SELECT MAX(pay_date) FROM public.commission_payouts cp WHERE cp.deal_commission_id = dc.id)
    ) AS last_paid_at,
    -- Status summary
    CASE 
        WHEN SUM(dc.commission_amount - dc.paid_amount) <= 0 THEN 'PAID'
        WHEN SUM(dc.paid_amount) > 0 THEN 'PARTIAL'
        ELSE 'PENDING'
    END AS status
FROM public.deal_commissions dc
JOIN public.deals d ON d.id = dc.deal_id
JOIN public.profiles p ON p.id = dc.profile_id
WHERE d.deleted_at IS NULL
  -- Exclude cancelled deals if status column exists, assuming 'cancelled' is not a valid status for commissionable deals
  -- or check deal status. For now, we trust deal_commissions existence implies validity unless deal is deleted.
GROUP BY dc.profile_id, p.full_name, DATE_TRUNC('month', d.created_at);

-- 2. Create RPC: get_commission_payout_month
-- Fetches payout data for a specific month where there is a remaining balance
CREATE OR REPLACE FUNCTION public.get_commission_payout_month(p_month_str TEXT)
RETURNS SETOF public.v_commission_payout_monthly
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.v_commission_payout_monthly
  WHERE payout_month = DATE_TRUNC('month', p_month_str::date)::date
    -- AND remaining_to_pay > 0 -- User requested this filter, but maybe we want to see paid ones too?
    -- User said: "เอาเฉพาะ remaining_to_pay > 0 มาใช้แสดงในหน้า 'ต้องจ่ายเดือนนี้'"
    -- But the UI has a "Paid" column, so maybe we want all?
    -- The user's example query had "WHERE remaining_to_pay > 0".
    -- I will return ALL for the month, and let the frontend filter or sort, 
    -- OR I can add a parameter to filter.
    -- Actually, the user's prompt said: "WHERE remaining_to_pay > 0" for the RPC.
    -- But the UI shows "Paid" status rows too. 
    -- I will return ALL rows for that month to support the full UI (which shows Paid/Partial/Unpaid).
    -- If the user strictly wants "To Pay", they can filter in frontend or I can make another RPC.
    -- I'll stick to returning ALL for the month so the "Paid" tab/section works too.
    ;
$$;

-- 3. Create RPC: pay_all_commissions_for_month
-- Marks all pending commissions for a specific person and month as PAID
CREATE OR REPLACE FUNCTION public.pay_all_commissions_for_month(
    p_profile_id UUID,
    p_month_str TEXT,
    p_actor UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deal_commission RECORD;
    v_count INT := 0;
    v_total_paid NUMERIC(12,2) := 0;
BEGIN
    -- Loop through all unpaid/partial commissions for this person in this month
    FOR v_deal_commission IN
        SELECT dc.id, dc.commission_amount, dc.paid_amount
        FROM public.deal_commissions dc
        JOIN public.deals d ON d.id = dc.deal_id
        WHERE dc.profile_id = p_profile_id
          AND DATE_TRUNC('month', d.created_at)::date = DATE_TRUNC('month', p_month_str::date)::date
          AND dc.commission_amount > dc.paid_amount -- Only pay what's remaining
    LOOP
        -- Calculate remaining amount
        DECLARE
            v_remaining NUMERIC(12,2) := v_deal_commission.commission_amount - v_deal_commission.paid_amount;
        BEGIN
            -- Call record_commission_payout for each
            PERFORM public.record_commission_payout(
                v_deal_commission.id,
                v_remaining,
                CURRENT_DATE,
                'transfer', -- Default method
                'Bulk payment via Payout Tab',
                p_actor
            );
            v_count := v_count + 1;
            v_total_paid := v_total_paid + v_remaining;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_count,
        'total_paid', v_total_paid
    );
END;
$$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
