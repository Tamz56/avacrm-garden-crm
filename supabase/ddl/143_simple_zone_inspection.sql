-- เพิ่มคอลัมน์ผลตรวจล่าสุดใน stock_zones (แบบง่าย ไม่มี log table)
ALTER TABLE public.stock_zones
ADD COLUMN IF NOT EXISTS inspection_date DATE,                    -- วันที่ตรวจล่าสุด
ADD COLUMN IF NOT EXISTS inspection_trunk_inch NUMERIC(5,2),      -- ขนาดลำต้นเฉลี่ย (นิ้ว)
ADD COLUMN IF NOT EXISTS inspection_height_m NUMERIC(5,2),        -- ความสูงเฉลี่ย (เมตร)
ADD COLUMN IF NOT EXISTS inspection_pot_inch NUMERIC(5,2),        -- ขนาดกระถาง (นิ้ว)
ADD COLUMN IF NOT EXISTS inspection_notes TEXT;                   -- บันทึกงานในแปลง / การบำรุง
