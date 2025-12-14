-- 102_step2_create_functions.sql
-- สร้าง Function และ Grant สิทธิ์ (รันหลังจากมีตารางแล้ว)

-- 1) ลบ function เดิม (ถ้ามี)
DROP FUNCTION IF EXISTS public.get_deal_payment_summary(uuid);
DROP FUNCTION IF EXISTS public.get_monthly_payment_summary(date, date);

----------------------------------------------------------
-- 2) สร้างใหม่: get_deal_payment_summary
----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_deal_payment_summary(p_deal_id UUID)
RETURNS TABLE (
    deal_id          UUID,
    total_amount     NUMERIC(12, 2),
    paid_amount      NUMERIC(12, 2),
    remaining_amount NUMERIC(12, 2),
    is_fully_paid    BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id AS deal_id,
        d.grand_total AS total_amount,   -- ใช้ grand_total
        COALESCE(SUM(
            CASE WHEN dp.status = 'verified' THEN dp.amount ELSE 0 END
        ), 0) AS paid_amount,
        d.grand_total - COALESCE(SUM(
            CASE WHEN dp.status = 'verified' THEN dp.amount ELSE 0 END
        ), 0) AS remaining_amount,
        (d.grand_total - COALESCE(SUM(
            CASE WHEN dp.status = 'verified' THEN dp.amount ELSE 0 END
        ), 0)) <= 0 AS is_fully_paid
    FROM public.deals d
    LEFT JOIN public.deal_payments dp
        ON dp.deal_id = d.id
    WHERE d.id = p_deal_id
    GROUP BY d.id, d.grand_total;
END;
$$;

----------------------------------------------------------
-- 3) สร้างใหม่: get_monthly_payment_summary
----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_payment_summary(
    p_month_start DATE,
    p_month_end   DATE
)
RETURNS TABLE (
    total_payments      NUMERIC(14, 2),
    verified_payments   NUMERIC(14, 2),
    pending_payments    NUMERIC(14, 2),
    cancelled_payments  NUMERIC(14, 2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT
        COALESCE(SUM(amount), 0) AS total_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) AS verified_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'cancelled'), 0) AS cancelled_payments
    FROM public.deal_payments
    WHERE payment_date >= p_month_start
      AND payment_date <  p_month_end;
$$;

----------------------------------------------------------
-- 4) ให้สิทธิ์ execute RPC
----------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_deal_payment_summary(UUID)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_monthly_payment_summary(DATE, DATE)
  TO anon, authenticated, service_role;
