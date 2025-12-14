-- 120_fix_v2_no_paid_amount.sql
-- แก้ไขฟังก์ชัน V2 ให้ไม่เรียกใช้ paid_amount ที่ยังไม่มีในตาราง

-- 1. ลบฟังก์ชันเดิม
DROP FUNCTION IF EXISTS public.profile_monthly_commission_details_v2(uuid, date, date);

-- 2. สร้างใหม่โดยใช้ค่า 0 แทน paid_amount
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
    SELECT
        dc.id              AS deal_commission_id,
        dc.deal_id,
        d.title            AS deal_title,
        dc.role,
        dc.base_amount     AS deal_amount,
        dc.commission_amount,
        0::numeric(12,2)   AS paid_in_month,      -- Placeholder
        0::numeric(12,2)   AS total_paid,         -- Placeholder
        dc.commission_amount AS remaining_amount, -- สมมติว่ายังไม่ได้จ่ายเลย
        NULL::date         AS last_pay_date,      -- Placeholder
        dc.status
    FROM public.deal_commissions dc
    JOIN public.deals d
      ON d.id = dc.deal_id
    WHERE dc.profile_id = p_profile_id
    ORDER BY d.title;
$$;

-- 3. ให้สิทธิ์
GRANT EXECUTE ON FUNCTION public.profile_monthly_commission_details_v2(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
