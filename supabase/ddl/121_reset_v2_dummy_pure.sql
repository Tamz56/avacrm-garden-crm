-- 121_reset_v2_dummy_pure.sql
-- รีเซ็ตฟังก์ชัน V2 เป็นแบบ Dummy 100% (ไม่ยุ่งกับตาราง) เพื่อแก้ปัญหา Cache

-- 1. ลบฟังก์ชันเดิมทิ้งให้หมด
DROP FUNCTION IF EXISTS public.profile_monthly_commission_details_v2(uuid, date, date);

-- 2. สร้างฟังก์ชัน Dummy (คืนค่าว่างเสมอ)
CREATE OR REPLACE FUNCTION public.profile_monthly_commission_details_v2(
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
    -- ไม่ดึงจากตารางไหนเลย คืน "ตารางว่าง" อย่างเดียว
    SELECT
        NULL::uuid        AS deal_commission_id,
        NULL::uuid        AS deal_id,
        NULL::text        AS deal_title,
        NULL::text        AS role,
        0::numeric(12,2)  AS deal_amount,
        0::numeric(12,2)  AS commission_amount,
        0::numeric(12,2)  AS paid_in_month,
        0::numeric(12,2)  AS total_paid,
        0::numeric(12,2)  AS remaining_amount,
        NULL::date        AS last_pay_date,
        'DUMMY'::text     AS status
    WHERE FALSE;  -- ทำให้ไม่คืนแถวใด ๆ เลย
$$;

-- 3. ให้สิทธิ์
GRANT EXECUTE ON FUNCTION public.profile_monthly_commission_details_v2(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
