-- 1) เพิ่มคอลัมน์วันที่เข้า-ออกสต็อกให้ tree_tags
ALTER TABLE public.tree_tags
ADD COLUMN IF NOT EXISTS stock_in_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.tree_tags
ADD COLUMN IF NOT EXISTS stock_out_date DATE;

-- (optional) ตั้งค่า stock_in_date ย้อนหลังสำหรับ Tag เดิมที่ยังไม่มี
UPDATE public.tree_tags
SET stock_in_date = COALESCE(stock_in_date, created_at::date);
