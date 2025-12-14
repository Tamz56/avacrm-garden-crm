-- 119_create_v3_function.sql
-- สร้างฟังก์ชันชื่อใหม่ V3 เพื่อหนีปัญหา Cache ของชื่อเดิม

-- 1. สร้างฟังก์ชัน Dummy V3 (ชื่อใหม่ที่ไม่เคยใช้)
CREATE OR REPLACE FUNCTION public.get_profile_commissions_v3(
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

-- 2. ให้สิทธิ์
GRANT EXECUTE ON FUNCTION public.get_profile_commissions_v3(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';

-- 4. ทดสอบทันที (ต้องขึ้น Success)
SELECT * FROM public.get_profile_commissions_v3(
  '36ee44ca-1dad-44ad-83dd-43646073f2c2'::uuid,
  '2025-11-01'::date,
  '2025-12-01'::date
);
