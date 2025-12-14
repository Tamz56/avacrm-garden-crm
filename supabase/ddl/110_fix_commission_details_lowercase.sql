-- 110_fix_commission_details_lowercase.sql
-- แก้ไขปัญหา type mismatch โดยใช้ lowercase types

-- ลบ functions เก่าทั้งหมด
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details(uuid, date, date);

-- สร้างใหม่ด้วย lowercase types
CREATE OR REPLACE FUNCTION public.get_profile_monthly_commission_details(
    p_profile_id  uuid,
    p_month_start date,
    p_month_end   date
)
RETURNS TABLE (
    deal_commission_id uuid,
    deal_id            uuid,
    deal_title         text,
    role               text,
    deal_amount        numeric(12,2),
    commission_amount  numeric(12,2),
    paid_in_month      numeric(12,2),
    total_paid         numeric(12,2),
    remaining_amount   numeric(12,2),
    last_pay_date      date,
    status             text
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
        d.grand_total              AS deal_amount,
        dc.commission_amount,
        COALESCE(pim.paid_in_month, 0) AS paid_in_month,
        dc.paid_amount             AS total_paid,
        (dc.commission_amount - dc.paid_amount) AS remaining_amount,
        pim.last_pay_date,
        dc.status
    FROM public.deal_commissions dc
    JOIN public.deals d
      ON d.id = dc.deal_id
    LEFT JOIN payouts_in_month pim
      ON pim.deal_commission_id = dc.id
    WHERE dc.profile_id = p_profile_id
      AND pim.paid_in_month IS NOT NULL
    ORDER BY pim.last_pay_date DESC, d.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_monthly_commission_details(uuid, date, date)
  TO anon, authenticated, service_role;

-- ⚡ บังคับ Reload Schema Cache ⚡
NOTIFY pgrst, 'reload schema';
