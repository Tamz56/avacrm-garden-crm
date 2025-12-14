-- ============================================================
-- แก้ไข error 42P10 แบบ Step-by-Step
-- รันทีละ STEP และเช็กผลลัพธ์
-- ============================================================

-- ========================================
-- STEP 1: เช็กว่ามี UNIQUE constraint หรือยัง
-- ========================================
-- รัน query นี้ก่อน ถ้าไม่มีผลลัพธ์ = ยังไม่มี constraint

SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND contype = 'u'
  AND conname LIKE '%deal_id%role%';

-- ถ้าไม่มีผลลัพธ์ ให้ไปทำ STEP 2
-- ถ้ามีแล้ว ให้ข้าม STEP 2 ไปทำ STEP 3

-- ========================================
-- STEP 2: เพิ่ม UNIQUE constraint
-- ========================================
-- รัน 3 บรรทัดนี้พร้อมกัน

ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_uniq CASCADE;

ALTER TABLE public.deal_commissions
ADD CONSTRAINT deal_commissions_deal_id_role_uniq
UNIQUE (deal_id, role);

-- ========================================
-- STEP 2.1: ยืนยันว่า constraint ถูกสร้างแล้ว
-- ========================================
-- ควรเห็น 1 แถว: deal_commissions_deal_id_role_uniq | UNIQUE (deal_id, role)

SELECT 
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND conname = 'deal_commissions_deal_id_role_uniq';

-- ถ้าเห็นแล้ว ไปทำ STEP 3
