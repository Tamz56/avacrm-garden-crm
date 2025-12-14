-- ==========================================================
-- FIX_COMMISSION_STATUS_FINAL.sql
-- แก้ปัญหา: deal_commissions_status_check แบบถอนรากถอนโคน
-- ==========================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. วนลูปลบ CHECK constraint ทั้งหมดในตาราง deal_commissionsทิ้ง
    -- (ป้องกันกรณีชื่อ constraint ไม่ตรงกับที่คิด หรือมีหลายตัวซ้อนกัน)
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.deal_commissions'::regclass 
        AND contype = 'c' -- c = check constraint
    ) LOOP
        RAISE NOTICE 'Dropping constraint: %', r.conname;
        EXECUTE 'ALTER TABLE public.deal_commissions DROP CONSTRAINT "' || r.conname || '"';
    END LOOP;
END $$;

-- 2. ปรับปรุงข้อมูลเดิมให้เป็นมาตรฐาน (ตัวเล็กหมด)
UPDATE public.deal_commissions 
SET status = LOWER(status);

-- 3. ตั้งค่า Default ให้เป็น 'pending' (ตัวเล็ก)
ALTER TABLE public.deal_commissions
ALTER COLUMN status SET DEFAULT 'pending';

-- 4. สร้าง Constraint ใหม่ที่ยืดหยุ่น (Case-Insensitive Regex Check)
-- รองรับ: pending, PENDING, Pending, partial, paid, cancelled, draft
ALTER TABLE public.deal_commissions
ADD CONSTRAINT deal_commissions_status_check 
CHECK (status ~* '^(pending|partial|paid|cancelled|draft)$');

-- 5. ยืนยันผลลัพธ์
COMMENT ON CONSTRAINT deal_commissions_status_check ON public.deal_commissions 
IS 'Allow status: pending, partial, paid, cancelled, draft (Case Insensitive)';
