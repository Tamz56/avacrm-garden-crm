-- เพิ่มคอลัมน์ stock_item_id ใน deal_items เพื่อผูกกับ stock_items
-- ไฟล์นี้ให้รันใน Supabase SQL Editor

-- 1) เพิ่มคอลัมน์ (ถ้ายังไม่มี)
ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS stock_item_id UUID NULL;

-- 2) ทำ FK ไปที่ stock_items (ถ้ายังไม่ได้ผูก)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deal_items_stock_item_id_fkey'
  ) THEN
    ALTER TABLE public.deal_items
    ADD CONSTRAINT deal_items_stock_item_id_fkey
      FOREIGN KEY (stock_item_id)
      REFERENCES public.stock_items (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END$$;

-- 3) index ไว้ช่วยเรื่อง performance
CREATE INDEX IF NOT EXISTS idx_deal_items_stock_item
  ON public.deal_items (stock_item_id);

COMMENT ON COLUMN public.deal_items.stock_item_id IS 'ผูกกับรายการสต็อกเฉพาะ (ถ้ามี) เพื่อดึงข้อมูลราคา/คงเหลือ และจองสต็อกอัตโนมัติ';
