-- ============================================================
-- เพิ่มคอลัมน์ payment_status และ paid_at ใน deals table
-- ============================================================

-- ลบ constraint เก่าก่อน (ถ้ามี)
DO $$ 
BEGIN
  ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_payment_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- เพิ่มคอลัมน์ payment_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deals' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.deals
    ADD COLUMN payment_status TEXT DEFAULT 'pending';
    
    RAISE NOTICE 'เพิ่มคอลัมน์ payment_status แล้ว';
  ELSE
    RAISE NOTICE 'คอลัมน์ payment_status มีอยู่แล้ว';
  END IF;
END $$;

-- เพิ่ม CHECK constraint ใหม่ (lowercase)
ALTER TABLE public.deals
ADD CONSTRAINT deals_payment_status_check 
CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled'));

-- เพิ่มคอลัมน์ paid_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deals' 
    AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.deals
    ADD COLUMN paid_at TIMESTAMPTZ;
    
    RAISE NOTICE 'เพิ่มคอลัมน์ paid_at แล้ว';
  ELSE
    RAISE NOTICE 'คอลัมน์ paid_at มีอยู่แล้ว';
  END IF;
END $$;

-- เพิ่ม comment
COMMENT ON COLUMN public.deals.payment_status IS 'สถานะการชำระเงิน: pending, partial, paid, cancelled (lowercase)';
COMMENT ON COLUMN public.deals.paid_at IS 'วันเวลาที่ชำระเงินเสร็จสมบูรณ์';

-- ตรวจสอบ
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deals'
  AND column_name IN ('payment_status', 'paid_at');
