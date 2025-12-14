-- 150_fix_commission_payouts_schema.sql
-- Fix missing columns in commission_payouts and recreate View/RPCs
-- Updated: Removed invalid check for 'deleted_at' on deals table

-- 1. Ensure commission_payouts has the required columns
ALTER TABLE public.commission_payouts 
ADD COLUMN IF NOT EXISTS pay_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.commission_payouts 
ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) CHECK (amount > 0);

ALTER TABLE public.commission_payouts 
ADD COLUMN IF NOT EXISTS deal_commission_id UUID REFERENCES public.deal_commissions(id) ON DELETE CASCADE;

-- 2. Re-create the View: v_commission_payout_monthly
DROP VIEW IF EXISTS public.v_commission_payout_monthly CASCADE;

CREATE OR REPLACE VIEW public.v_commission_payout_monthly AS
SELECT
    dc.profile_id AS sales_profile_id,
    p.full_name AS sales_name,
    DATE_TRUNC('month', COALESCE(d.deal_date, d.created_at))::date AS payout_month,
    SUM(dc.commission_amount) AS total_commission,
    SUM(dc.paid_amount) AS total_paid,
    SUM(dc.commission_amount - dc.paid_amount) AS remaining_to_pay,
    COUNT(DISTINCT dc.deal_id) AS deals_count,
    STRING_AGG(DISTINCT dc.role, ', ') AS roles,
    MAX(
        (SELECT MAX(pay_date) FROM public.commission_payouts cp WHERE cp.deal_commission_id = dc.id)
    ) AS last_paid_at,
    CASE 
        WHEN SUM(dc.commission_amount - dc.paid_amount) <= 0 THEN 'PAID'
        WHEN SUM(dc.paid_amount) > 0 THEN 'PARTIAL'
        ELSE 'PENDING'
    END AS status
FROM public.deal_commissions dc
JOIN public.deals d ON d.id = dc.deal_id
JOIN public.profiles p ON p.id = dc.profile_id
GROUP BY
    dc.profile_id,
    p.full_name,
    DATE_TRUNC('month', COALESCE(d.deal_date, d.created_at));

-- 3. Re-create RPC: get_commission_payout_month
CREATE OR REPLACE FUNCTION public.get_commission_payout_month(p_month_str TEXT)
RETURNS SETOF public.v_commission_payout_monthly
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.v_commission_payout_monthly
  WHERE payout_month = DATE_TRUNC('month', p_month_str::date)::date;
$$;

-- 4. Re-create RPC: pay_all_commissions_for_month
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
    FOR v_deal_commission IN
        SELECT dc.id, dc.commission_amount, dc.paid_amount
        FROM public.deal_commissions dc
        JOIN public.deals d ON d.id = dc.deal_id
        WHERE dc.profile_id = p_profile_id
          AND DATE_TRUNC('month', COALESCE(d.deal_date, d.created_at))::date = DATE_TRUNC('month', p_month_str::date)::date
          AND dc.commission_amount > dc.paid_amount
    LOOP
        DECLARE
            v_remaining NUMERIC(12,2) := v_deal_commission.commission_amount - v_deal_commission.paid_amount;
        BEGIN
            PERFORM public.record_commission_payout(
                v_deal_commission.id,
                v_remaining,
                CURRENT_DATE,
                'transfer',
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
