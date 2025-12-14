-- 128_cleanup_dummy_data.sql
-- ลบข้อมูล Dummy "V4 Connection Success" และข้อมูลทดสอบอื่นๆ ออกจากระบบ

-- 1. ลบ commission record ที่ผูกกับดีลชื่อ "V4 Connection Success"
DELETE FROM public.deal_commissions
WHERE deal_id IN (
  SELECT id FROM public.deals WHERE title = 'V4 Connection Success'
);

-- 2. ลบตัวดีลทดสอบออกจากระบบ
DELETE FROM public.deals
WHERE title = 'V4 Connection Success';

-- 3. ลบข้อมูล Dummy ID 0000... (เผื่อมีตกค้างจากฟังก์ชันเก่า)
DELETE FROM public.deal_commissions
WHERE deal_id = '00000000-0000-0000-0000-000000000000';
