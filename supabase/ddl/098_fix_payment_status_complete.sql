-- ============================================================
-- 098_fix_payment_status_complete.sql
-- สคริปต์แก้ปัญหา Payment Status แบบเบ็ดเสร็จ
-- ============================================================

-- 1. ลบ Constraint เก่า (ถ้ามี)
DO $$ 
BEGIN
  ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_payment_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 2. แปลงข้อมูลเดิมให้เป็น Lowercase ทั้งหมด (เพื่อไม่ให้ผิด Constraint ใหม่)
UPDATE public.deals SET payment_status = 'pending' WHERE payment_status ILIKE 'pending';
UPDATE public.deals SET payment_status = 'partial' WHERE payment_status ILIKE 'partial';
UPDATE public.deals SET payment_status = 'paid' WHERE payment_status ILIKE 'paid';
UPDATE public.deals SET payment_status = 'cancelled' WHERE payment_status ILIKE 'cancelled';

-- 3. สร้าง Constraint ใหม่ (Lowercase เท่านั้น)
ALTER TABLE public.deals
ADD CONSTRAINT deals_payment_status_check 
CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled'));

-- 4. สร้าง RPC Function ใหม่ (พร้อม Error Handling)
CREATE OR REPLACE FUNCTION public.mark_deal_paid(p_deal_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_deal RECORD;
BEGIN
  -- อัปเดตสถานะ
  UPDATE public.deals
  SET 
    payment_status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_deal_id
  RETURNING * INTO v_deal;

  -- กรณีไม่พบดีล
  IF v_deal IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Deal not found (ID: ' || p_deal_id || ')'
    );
  END IF;

  -- สำเร็จ
  RETURN jsonb_build_object(
    'ok', true,
    'deal', row_to_json(v_deal)
  );

EXCEPTION WHEN OTHERS THEN
  -- ดักจับ Error ทุกอย่าง (เช่น Constraint Violation) ส่งกลับเป็น JSON
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.mark_deal_paid(UUID) TO authenticated;

-- ตรวจสอบผลลัพธ์
SELECT count(*) as paid_deals_count FROM public.deals WHERE payment_status = 'paid';
