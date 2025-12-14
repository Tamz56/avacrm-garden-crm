-- 123_fix_final_function_defaults.sql
-- แก้ไขฟังก์ชันให้รับ parameters แบบมีค่า Default (แก้ปัญหา Parameter Mismatch)

DROP FUNCTION IF EXISTS public.get_commission_details_final(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_commission_details_final(
    p_profile_id  UUID DEFAULT NULL,
    p_month_start DATE DEFAULT NULL,
    p_month_end   DATE DEFAULT NULL
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
    -- คืนค่า Dummy เพื่อทดสอบ
    SELECT
        '00000000-0000-0000-0000-000000000000'::uuid AS deal_commission_id,
        '00000000-0000-0000-0000-000000000000'::uuid AS deal_id,
        'Connection Success (Params: ' || 
            COALESCE(p_profile_id::text, 'NULL') || ', ' || 
            COALESCE(p_month_start::text, 'NULL') || ', ' || 
            COALESCE(p_month_end::text, 'NULL') || ')' 
        AS deal_title,
        'Tester'::text                               AS role,
        1000::numeric(12,2)                          AS deal_amount,
        100::numeric(12,2)                           AS commission_amount,
        0::numeric(12,2)                             AS paid_in_month,
        0::numeric(12,2)                             AS total_paid,
        100::numeric(12,2)                           AS remaining_amount,
        CURRENT_DATE                                 AS last_pay_date,
        'TEST_OK'::text                              AS status;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_details_final(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
