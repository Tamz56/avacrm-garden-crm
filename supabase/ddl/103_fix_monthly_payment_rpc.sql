-- 103_fix_monthly_payment_rpc.sql
-- แก้ไขปัญหา 404 Not Found ของฟังก์ชัน get_monthly_payment_summary

-- 1) เผื่อมี version เก่า ๆ ที่ชื่อใกล้เคียงอยู่ ให้ลบทิ้งก่อน
DROP FUNCTION IF EXISTS public.get_monthly_payment_summary();
DROP FUNCTION IF EXISTS public.get_monthly_payment_summary(date, date);
DROP FUNCTION IF EXISTS public.get_monthly_payments_summary(date, date);

-- 2) สร้างฟังก์ชันใหม่ ชื่อและพารามิเตอร์ตรงกับที่ frontend เรียก
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

-- 3) ให้สิทธิ์ execute ผ่าน REST API
GRANT EXECUTE ON FUNCTION public.get_monthly_payment_summary(DATE, DATE)
  TO anon, authenticated, service_role;

-- 4) Verify เบื้องต้น (ถ้าไม่มี error คือใช้ได้)
-- SELECT * FROM public.get_monthly_payment_summary(CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month');
