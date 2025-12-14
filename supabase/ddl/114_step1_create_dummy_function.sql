-- 114_step1_create_dummy_function.sql
-- สร้างฟังก์ชัน dummy เพื่อทดสอบว่า signature ใช้ได้

-- ลบของเดิมออกก่อน (เผื่อมีอยู่แต่ signature ไม่ตรง)
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details();
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details(UUID, DATE, DATE);

-- สร้างเวอร์ชันง่าย ๆ ก่อน เพื่อเช็คว่า function ใช้งานได้จริง
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
    -- ตอนนี้ให้คืนแถวเปล่า ๆ ไปก่อน
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
    WHERE FALSE;  -- จะไม่คืนแถวใด ๆ เลย (result ว่าง)
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_monthly_commission_details(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

-- ⚡ บังคับ Reload Schema Cache ⚡
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- ทดสอบทันที
-- ============================================================
-- ถ้า query นี้รันได้ (แม้ผลจะว่าง) = สำเร็จ ✅
SELECT *
FROM public.get_profile_monthly_commission_details(
  '36ee44ca-1dad-44ad-83dd-43646073f2c2'::uuid,
  '2025-11-01'::date,
  '2025-12-01'::date
);
