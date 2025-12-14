-- 115_step2_replace_with_real_function.sql
-- แทนที่ฟังก์ชัน dummy ด้วยเวอร์ชันจริง (รันหลังจาก step 1 สำเร็จ)

CREATE OR REPLACE FUNCTION public.get_profile_monthly_commission_details(
    p_profile_id  UUID,
    p_month_start DATE,
    p_month_end   DATE
)
RETURNS TABLE (
    deal_commission_id UUID,
    deal_id            UUID,
    deal_title         TEXT,
    role               TEXT,
    deal_amount        NUMERIC(12,2),
    commission_amount  NUMERIC(12,2),
    paid_in_month      NUMERIC(12,2),
    total_paid         NUMERIC(12,2),
    remaining_amount   NUMERIC(12,2),
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
        dc.base_amount             AS deal_amount,
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

-- GRANT (เผื่อต้องการรันซ้ำ)
GRANT EXECUTE ON FUNCTION public.get_profile_monthly_commission_details(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

-- ⚡ บังคับ Reload Schema Cache ⚡
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- ทดสอบอีกครั้ง
-- ============================================================
-- ตอนนี้ถ้ามีการจ่ายคอมในเดือนนี้ ผลจะเริ่มมีแถว
SELECT *
FROM public.get_profile_monthly_commission_details(
  '36ee44ca-1dad-44ad-83dd-43646073f2c2'::uuid,
  '2025-11-01'::date,
  '2025-12-01'::date
);
