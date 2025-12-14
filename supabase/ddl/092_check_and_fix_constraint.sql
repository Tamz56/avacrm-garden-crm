-- ============================================================
-- เช็กและแก้ไข UNIQUE constraint สำหรับ deal_commissions
-- เพื่อแก้ error 42P10: ON CONFLICT specification
-- ============================================================

-- ========================================
-- 1) เช็ก constraints ปัจจุบันของ deal_commissions
-- ========================================
SELECT
  conname AS constraint_name,
  contype AS type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
ORDER BY contype, conname;

-- ประเภท constraint:
-- p = PRIMARY KEY
-- u = UNIQUE
-- f = FOREIGN KEY
-- c = CHECK

-- ========================================
-- 2) เช็กว่ามี UNIQUE บน (deal_id, role) หรือยัง
-- ========================================
SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND contype = 'u'
  AND pg_get_constraintdef(oid) LIKE '%deal_id%'
  AND pg_get_constraintdef(oid) LIKE '%role%';

-- ถ้าไม่มีผลลัพธ์ = ยังไม่มี UNIQUE constraint บน (deal_id, role)

-- ========================================
-- 3) เพิ่ม UNIQUE constraint (ถ้ายังไม่มี)
-- ========================================
-- ลบ constraint เก่าก่อน (ถ้ามี)
ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_uniq CASCADE;

ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_key CASCADE;

-- เพิ่ม constraint ใหม่
ALTER TABLE public.deal_commissions
ADD CONSTRAINT deal_commissions_deal_id_role_uniq
UNIQUE (deal_id, role);

-- ========================================
-- 4) ตรวจสอบว่า constraint ถูกสร้างแล้ว
-- ========================================
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND conname = 'deal_commissions_deal_id_role_uniq';

-- คาดหวัง:
-- constraint_name: deal_commissions_deal_id_role_uniq
-- definition: UNIQUE (deal_id, role)

-- ========================================
-- 5) เช็กโครงสร้างตาราง deal_commissions
-- ========================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deal_commissions'
ORDER BY ordinal_position;

-- ตรวจสอบว่ามีคอลัมน์ deal_id และ role จริง

COMMENT ON CONSTRAINT deal_commissions_deal_id_role_uniq ON public.deal_commissions 
IS 'ป้องกันการมีคอมมิชชันซ้ำสำหรับ role เดียวกันในดีลเดียวกัน - แก้ error 42P10';
