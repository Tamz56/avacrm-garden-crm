-- 116_reset_commission_details_dummy.sql
-- รีเซ็ตฟังก์ชัน get_profile_monthly_commission_details เป็นเวอร์ชัน Dummy เพื่อทดสอบการเชื่อมต่อ

-- ============================================================
-- 1. เช็กว่ามีฟังก์ชันชื่อใกล้เคียงไหม (รันดูผลลัพธ์ได้)
-- ============================================================
/*
SELECT
  n.nspname   AS schema,
  p.proname   AS func_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE 'get_profile_monthly_commission%';
*/

-- ============================================================
-- 2. ลบทุกเวอร์ชันที่อาจมีอยู่ (Clean Slate)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details();
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details(uuid, date);
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details(uuid);

-- ============================================================
-- 3. สร้างฟังก์ชัน Dummy (Signature ตรงเป๊ะ แต่คืนค่าว่าง)
-- ============================================================
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
    -- คืน result ว่าง ๆ ไว้ทดสอบก่อน
    SELECT
        NULL::uuid AS deal_commission_id,
        NULL::uuid AS deal_id,
        NULL::text AS deal_title,
        NULL::text AS role,
        0::numeric(12,2) AS deal_amount,
        0::numeric(12,2) AS commission_amount,
        0::numeric(12,2) AS paid_in_month,
        0::numeric(12,2) AS total_paid,
        0::numeric(12,2) AS remaining_amount,
        NULL::date AS last_pay_date,
        'PENDING'::text AS status
    WHERE FALSE;  -- ทำให้ผลลัพธ์เป็น "ตารางว่าง" (0 rows)
$$;

-- ============================================================
-- 4. ให้สิทธิ์ (สำคัญมาก)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_profile_monthly_commission_details(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

-- ============================================================
-- 5. บังคับ Reload Schema Cache (เพื่อให้ API มองเห็นทันที)
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 6. ทดสอบทันที (ถ้าผ่านต้องไม่ Error)
-- ============================================================
/*
SELECT *
FROM public.get_profile_monthly_commission_details(
  '36ee44ca-1dad-44ad-83dd-43646073f2c2'::uuid,
  '2025-11-01'::date,
  '2025-12-01'::date
);
*/
