-- 124_create_v4_function.sql
-- สร้างฟังก์ชัน V4 โดยเปลี่ยนชื่อพารามิเตอร์ใหม่ทั้งหมด เพื่อแก้ปัญหา Parameter หาย

-- 1. สร้างฟังก์ชัน V4 (ชื่อใหม่, ตัวแปรชื่อใหม่)
CREATE OR REPLACE FUNCTION public.get_commission_v4(
    pid        UUID DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date   DATE DEFAULT NULL
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
    -- คืนค่า Dummy 1 แถว เพื่อทดสอบการเชื่อมต่อ
    SELECT
        '00000000-0000-0000-0000-000000000000'::uuid AS deal_commission_id,
        '00000000-0000-0000-0000-000000000000'::uuid AS deal_id,
        'V4 Connection Success'::text                AS deal_title,
        'System'::text                               AS role,
        1000::numeric(12,2)                          AS deal_amount,
        100::numeric(12,2)                           AS commission_amount,
        0::numeric(12,2)                             AS paid_in_month,
        0::numeric(12,2)                             AS total_paid,
        100::numeric(12,2)                           AS remaining_amount,
        CURRENT_DATE                                 AS last_pay_date,
        'OK'::text                                   AS status;
$$;

-- 2. ให้สิทธิ์
GRANT EXECUTE ON FUNCTION public.get_commission_v4(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';

-- 4. ทดสอบทันที (ต้องขึ้นข้อมูล 1 แถว)
SELECT * FROM public.get_commission_v4(
  '36ee44ca-1dad-44ad-83dd-43646073f2c2'::uuid,
  '2025-11-01'::date,
  '2025-12-01'::date
);
