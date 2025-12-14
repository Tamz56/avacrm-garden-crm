-- ==========================================
-- FIX_COMMISSION_STATUS_ROBUST.sql
-- แก้ปัญหา Constraint Status แบบกันเหนียวที่สุด (Robust Fix)
-- ==========================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1) ลบ CHECK constraint เดิมที่เกี่ยวกับ status ทั้งหมด
    -- (ไม่ว่าจะชื่อ auto-generated หรือชื่อที่เราตั้งเอง)
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.deal_commissions'::regclass
          AND contype = 'c' -- c = check constraint
          AND pg_get_constraintdef(oid) ILIKE '%status%' -- หา constraint ที่เช็ค column status
    ) LOOP
        RAISE NOTICE 'Dropping constraint: %', r.conname;
        EXECUTE format(
            'ALTER TABLE public.deal_commissions DROP CONSTRAINT %I',
            r.conname
        );
    END LOOP;
END $$;

-- 2) Normalize ข้อมูลเดิม: trim + lower
-- ปรับข้อมูลเก่าให้สะอาดที่สุด เพื่อไม่ให้ผิด constraint ใหม่
UPDATE public.deal_commissions
SET status = CASE
    WHEN status IS NULL THEN NULL
    ELSE lower(trim(status))
END;

-- 3) ตั้งค่า DEFAULT เป็น 'pending' (ตัวเล็ก ชัดเจน)
ALTER TABLE public.deal_commissions
ALTER COLUMN status SET DEFAULT 'pending';

-- 4) สร้าง CHECK ใหม่ (กันเหนียวสุด ๆ)
-- - อนุญาตให้ status เป็น NULL (เผื่อ code ไม่ส่งมา set default ทีหลังได้ หรือยอมให้ null ไปก่อน)
-- - trim + lower ก่อนเช็ค (ยอมรับ ' Pending ', 'PENDING', 'pending')
ALTER TABLE public.deal_commissions
ADD CONSTRAINT deal_commissions_status_check
CHECK (
    status IS NULL
    OR lower(trim(status)) IN ('pending', 'partial', 'paid', 'cancelled', 'draft')
);

COMMENT ON CONSTRAINT deal_commissions_status_check ON public.deal_commissions
IS 'Allow status: pending, partial, paid, cancelled, draft (case-insensitive, trimmed, NULL allowed)';

-- 5) แจ้งเตือน: 
-- หลังจากนี้ Code ฝั่ง Backend ควรส่ง 'pending' ตัวเล็กเสมอเพื่อความ clean
-- แต่ถ้าเผลอส่งตัวใหญ่มา Constraint นี้ก็จะช่วยรับให้ผ่านได้ครับ
