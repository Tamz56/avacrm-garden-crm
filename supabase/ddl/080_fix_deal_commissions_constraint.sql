-- แก้ไข deal_commissions table เพื่อรองรับ ON CONFLICT
-- รันไฟล์นี้ใน Supabase SQL Editor ก่อนทดสอบปิดดีล

-- 1) เพิ่ม UNIQUE constraint สำหรับ (deal_id, role)
-- ป้องกัน error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_uniq;

ALTER TABLE public.deal_commissions
ADD CONSTRAINT deal_commissions_deal_id_role_uniq
UNIQUE (deal_id, role);

-- 2) ตรวจสอบว่า constraint ถูกสร้างแล้ว
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND conname = 'deal_commissions_deal_id_role_uniq';

-- ผลลัพธ์ที่คาดหวัง:
-- constraint_name: deal_commissions_deal_id_role_uniq
-- constraint_type: u (UNIQUE)
-- definition: UNIQUE (deal_id, role)

COMMENT ON CONSTRAINT deal_commissions_deal_id_role_uniq ON public.deal_commissions 
IS 'ป้องกันการมีคอมมิชชันซ้ำสำหรับ role เดียวกันในดีลเดียวกัน';
