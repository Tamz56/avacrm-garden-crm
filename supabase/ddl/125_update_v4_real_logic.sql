-- 125_update_v4_real_logic.sql
-- อัปเดตฟังก์ชัน V4 ให้ดึงข้อมูลจริงจากตาราง deal_commissions

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
    SELECT
        dc.id                      AS deal_commission_id,
        dc.deal_id                 AS deal_id,
        d.title                    AS deal_title,
        dc.role                    AS role,
        COALESCE(dc.base_amount, 0)       AS deal_amount,
        COALESCE(dc.commission_amount, 0) AS commission_amount,
        
        -- Placeholder สำหรับยอดจ่าย (เพราะยังไม่มีตาราง payouts)
        0::numeric(12,2)           AS paid_in_month,
        0::numeric(12,2)           AS total_paid,
        
        -- เหลือเท่ากับยอดคอมทั้งหมด (เพราะยังไม่ได้จ่าย)
        COALESCE(dc.commission_amount, 0) AS remaining_amount,
        
        NULL::date                 AS last_pay_date,
        dc.status                  AS status
    FROM public.deal_commissions dc
    JOIN public.deals d ON d.id = dc.deal_id
    WHERE 
        -- กรองตาม Profile
        (pid IS NULL OR dc.profile_id = pid)
        
        -- กรองตามวันที่ (ใช้ created_at ของดีลแทนไปก่อน)
        AND (start_date IS NULL OR d.created_at >= start_date::timestamp)
        AND (end_date IS NULL OR d.created_at < (end_date + INTERVAL '1 day')::timestamp)
    ORDER BY d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_v4(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
