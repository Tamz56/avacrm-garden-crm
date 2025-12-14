-- 117_create_commission_details_v2.sql
-- สร้างฟังก์ชัน V2 เพื่อแก้ปัญหา Cache 404

DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details_v2(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_profile_monthly_commission_details_v2(
    p_profile_id  UUID,
    p_month_start DATE,
    p_month_end   DATE
)
RETURNS TABLE (
    deal_commission_id UUID,
    deal_id            UUID,
    deal_title         TEXT,
    role               TEXT,
    deal_amount        NUMERIC,
    commission_amount  NUMERIC,
    paid_in_month      NUMERIC,
    total_paid         NUMERIC,
    remaining_amount   NUMERIC,
    last_pay_date      DATE,
    status             TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    WITH payouts_in_month AS (
        SELECT
            cp.deal_commission_id,
            SUM(cp.amount)   AS paid_in_month,
            MAX(cp.pay_date) AS last_pay_date
        FROM public.commission_payouts cp
        JOIN public.deal_commissions dc
          ON dc.id = cp.deal_commission_id
        WHERE dc.profile_id = p_profile_id
          AND cp.pay_date >= p_month_start
          AND cp.pay_date <  p_month_end
        GROUP BY cp.deal_commission_id
    )
    SELECT
        dc.id                      AS deal_commission_id,
        dc.deal_id,
        d.title                    AS deal_title,
        dc.role,
        COALESCE(dc.base_amount, 0) AS deal_amount,
        COALESCE(dc.commission_amount, 0),
        COALESCE(pim.paid_in_month, 0) AS paid_in_month,
        COALESCE(dc.paid_amount, 0)    AS total_paid,
        (COALESCE(dc.commission_amount, 0) - COALESCE(dc.paid_amount, 0)) AS remaining_amount,
        pim.last_pay_date,
        dc.status
    FROM public.deal_commissions dc
    JOIN public.deals d
      ON d.id = dc.deal_id
    LEFT JOIN payouts_in_month pim
      ON pim.deal_commission_id = dc.id
    WHERE dc.profile_id = p_profile_id
      AND pim.paid_in_month IS NOT NULL
    ORDER BY pim.last_pay_date DESC NULLS LAST, d.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_monthly_commission_details_v2(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
