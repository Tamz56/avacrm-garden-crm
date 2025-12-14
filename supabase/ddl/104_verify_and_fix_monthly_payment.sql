-- 104_verify_and_fix_monthly_payment.sql
-- สคริปต์ตรวจสอบและแก้ไขฟังก์ชัน get_monthly_payment_summary (Fix 404/Signature issues)

-- ============================================================
-- 1) ตรวจสอบว่ามีฟังก์ชันอยู่หรือไม่
-- ============================================================
-- ลองรัน query นี้ดูผลลัพธ์ว่ามี row ขึ้นมาหรือไม่ และ args เป็น (date, date) หรือไม่
/*
SELECT
  n.nspname   AS schema,
  p.proname   AS func_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_monthly_payment_summary';
*/

-- ============================================================
-- 2) ล้างของเก่าและสร้างใหม่ (Recreate & Grant)
-- ============================================================

-- ลบ function ที่อาจมีอยู่ (กันชนชื่อ/args เพี้ยน)
DROP FUNCTION IF EXISTS public.get_monthly_payment_summary();
DROP FUNCTION IF EXISTS public.get_monthly_payment_summary(date, date);
DROP FUNCTION IF EXISTS public.get_monthly_payments_summary(date, date);

-- สร้างใหม่
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

-- ให้สิทธิ์ execute
GRANT EXECUTE ON FUNCTION public.get_monthly_payment_summary(DATE, DATE)
  TO anon, authenticated, service_role;

-- ============================================================
-- 3) ทดสอบการเรียกใช้งานทันที
-- ============================================================
-- ถ้ารันผ่าน แสดงว่าฟังก์ชันใช้งานได้แล้ว
SELECT *
FROM public.get_monthly_payment_summary('2025-11-01'::date, '2025-12-01'::date);
