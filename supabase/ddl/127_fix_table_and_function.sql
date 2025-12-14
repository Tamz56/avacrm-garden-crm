-- 127_fix_table_and_function.sql
-- รวมมิตร: ซ่อมตาราง deal_commissions และอัปเดตฟังก์ชัน V4 ให้ใช้งานได้จริง

-- ============================================================
-- 1. ซ่อมตาราง deal_commissions (เพิ่มคอลัมน์ที่อาจจะขาด)
-- ============================================================

-- สร้างตารางถ้ายังไม่มี (เผื่อกรณีหายไปเลย)
CREATE TABLE IF NOT EXISTS public.deal_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- เพิ่มคอลัมน์ profile_id ถ้ายังไม่มี
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_commissions' AND column_name = 'profile_id') THEN
        ALTER TABLE public.deal_commissions ADD COLUMN profile_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- เพิ่มคอลัมน์อื่นๆ ที่จำเป็น
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_commissions' AND column_name = 'role') THEN
        ALTER TABLE public.deal_commissions ADD COLUMN role TEXT DEFAULT 'sales_agent';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_commissions' AND column_name = 'base_amount') THEN
        ALTER TABLE public.deal_commissions ADD COLUMN base_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_commissions' AND column_name = 'commission_amount') THEN
        ALTER TABLE public.deal_commissions ADD COLUMN commission_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_commissions' AND column_name = 'paid_amount') THEN
        ALTER TABLE public.deal_commissions ADD COLUMN paid_amount NUMERIC(12, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deal_commissions' AND column_name = 'status') THEN
        ALTER TABLE public.deal_commissions ADD COLUMN status TEXT DEFAULT 'PENDING';
    END IF;
END $$;

-- ============================================================
-- 2. อัปเดตฟังก์ชัน V4 (ดึงข้อมูลจริง)
-- ============================================================
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
        COALESCE(dc.role, 'N/A')   AS role,
        COALESCE(dc.base_amount, 0)       AS deal_amount,
        COALESCE(dc.commission_amount, 0) AS commission_amount,
        
        -- Placeholder สำหรับยอดจ่าย
        0::numeric(12,2)           AS paid_in_month,
        COALESCE(dc.paid_amount, 0) AS total_paid,
        
        -- เหลือเท่ากับ (ยอดคอม - ยอดจ่ายรวม)
        (COALESCE(dc.commission_amount, 0) - COALESCE(dc.paid_amount, 0)) AS remaining_amount,
        
        NULL::date                 AS last_pay_date,
        COALESCE(dc.status, 'PENDING') AS status
    FROM public.deal_commissions dc
    JOIN public.deals d ON d.id = dc.deal_id
    WHERE 
        -- กรองตาม Profile (ถ้ามีค่า)
        (pid IS NULL OR dc.profile_id = pid)
        
        -- กรองตามวันที่ (ใช้ created_at ของดีลแทนไปก่อน)
        AND (start_date IS NULL OR d.created_at >= start_date::timestamp)
        AND (end_date IS NULL OR d.created_at < (end_date + INTERVAL '1 day')::timestamp)
    ORDER BY d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_v4(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
