-- 130_fix_deal_payments_rls.sql
-- แก้ไขปัญหา RLS ของตาราง deal_payments ให้สามารถบันทึกข้อมูลได้

-- 1. เปิดใช้งาน RLS (เผื่อยังไม่ได้เปิด)
ALTER TABLE public.deal_payments ENABLE ROW LEVEL SECURITY;

-- 2. ลบ Policy เก่าออกให้หมดก่อน (เพื่อความชัวร์)
DROP POLICY IF EXISTS "deal_payments_select_authenticated" ON public.deal_payments;
DROP POLICY IF EXISTS "deal_payments_modify_authenticated" ON public.deal_payments;
DROP POLICY IF EXISTS "deal_payments_all_authenticated" ON public.deal_payments;

-- 3. สร้าง Policy ใหม่แบบรวม (อนุญาตทุกอย่างสำหรับคนล็อกอิน)
CREATE POLICY "deal_payments_all_authenticated"
ON public.deal_payments
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. ให้สิทธิ์ Table กับ Role ที่เกี่ยวข้อง
GRANT ALL ON TABLE public.deal_payments TO authenticated;
GRANT ALL ON TABLE public.deal_payments TO service_role;

-- 5. แจ้ง Reload Schema
NOTIFY pgrst, 'reload schema';
