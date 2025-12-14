-- 105_force_refresh_rpc.sql
-- สร้างฟังก์ชันอีกครั้ง + บังคับ Reload Schema Cache แก้ปัญหา 404

-- 1. สร้างฟังก์ชัน (Recreate เพื่อความชัวร์)
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

-- 2. ให้สิทธิ์ (Grant Permission)
GRANT EXECUTE ON FUNCTION public.get_monthly_payment_summary(DATE, DATE) 
TO anon, authenticated, service_role;

-- 3. ⚡ คำสั่งสำคัญ: บังคับ API ให้รีโหลด Schema Cache เดี๋ยวนี้ ⚡
NOTIFY pgrst, 'reload schema';
