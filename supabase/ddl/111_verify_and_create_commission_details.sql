-- 111_verify_and_create_commission_details.sql
-- ตรวจสอบและสร้างฟังก์ชัน get_profile_monthly_commission_details

-- ============================================================
-- ขั้นตอนที่ 1: ตรวจสอบว่ามีฟังก์ชันอะไรอยู่บ้าง
-- ============================================================
-- รัน query นี้ก่อนเพื่อดูว่ามีฟังก์ชันอะไรอยู่
/*
SELECT
  n.nspname   AS schema,
  p.proname   AS func_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%commission%';
*/

-- ============================================================
-- ขั้นตอนที่ 2: ลบฟังก์ชันเก่าทั้งหมด
-- ============================================================
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details CASCADE;

-- ============================================================
-- ขั้นตอนที่ 3: สร้างฟังก์ชันใหม่
-- ============================================================
CREATE FUNCTION public.get_profile_monthly_commission_details(
    p_profile_id  uuid,
    p_month_start date,
    p_month_end   date
)
RETURNS TABLE (
    deal_commission_id uuid,
    deal_id            uuid,
    deal_title         text,
    role               text,
    deal_amount        numeric,
    commission_amount  numeric,
    paid_in_month      numeric,
    total_paid         numeric,
    remaining_amount   numeric,
    last_pay_date      date,
    status             text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
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
        dc.id,
        dc.deal_id,
        COALESCE(d.title, 'ไม่มีชื่อดีล'),
        dc.role,
        COALESCE(d.grand_total, 0),
        dc.commission_amount,
        COALESCE(pim.paid_in_month, 0),
        dc.paid_amount,
        (dc.commission_amount - dc.paid_amount),
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
END;
$$;

-- ============================================================
-- ขั้นตอนที่ 4: ให้สิทธิ์
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_profile_monthly_commission_details(uuid, date, date)
  TO anon, authenticated, service_role;

-- ============================================================
-- ขั้นตอนที่ 5: Reload Schema
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- ขั้นตอนที่ 6: ทดสอบ
-- ============================================================
-- ลอง uncomment และรันเพื่อทดสอบ
/*
SELECT * FROM public.get_profile_monthly_commission_details(
  '36ee44ca-1dad-44ad-83dd-43646073f2c2'::uuid,
  '2025-11-01'::date,
  '2025-12-01'::date
);
*/
