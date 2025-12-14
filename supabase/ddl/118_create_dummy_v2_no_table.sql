-- 118_create_dummy_v2_no_table.sql
-- สร้างฟังก์ชัน Dummy V2 (ตัด get_ ออก) เพื่อทดสอบ RPC โดยไม่พึ่งพาตาราง

-- 1. ลบฟังก์ชันที่อาจมีชื่อซ้ำ
DROP FUNCTION IF EXISTS public.profile_monthly_commission_details_v2(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_profile_monthly_commission_details_v2(uuid, date, date); -- ลบตัวเก่าด้วย

-- 2. สร้างฟังก์ชัน Dummy (ไม่เรียกตารางใดๆ)
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
    -- คืนค่าว่างๆ เพื่อทดสอบการเชื่อมต่อ
    SELECT
        NULL::uuid          AS deal_commission_id,
        NULL::uuid          AS deal_id,
        NULL::text          AS deal_title,
        NULL::text          AS role,
        0::numeric(12,2)    AS deal_amount,
        0::numeric(12,2)    AS commission_amount,
        0::numeric(12,2)    AS paid_in_month,
        0::numeric(12,2)    AS total_paid,
        0::numeric(12,2)    AS remaining_amount,
        NULL::date          AS last_pay_date,
        'PENDING'::text     AS status
    WHERE FALSE;  -- Empty Result
$$;

-- 3. ให้สิทธิ์
GRANT EXECUTE ON FUNCTION public.profile_monthly_commission_details_v2(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
