-- 1. Add columns to stock_zones table
ALTER TABLE public.stock_zones
ADD COLUMN IF NOT EXISTS area_rai NUMERIC(10,2),           -- พื้นที่แปลง (ไร่)
ADD COLUMN IF NOT EXISTS area_width_m NUMERIC(10,2),       -- กว้าง (เมตร)
ADD COLUMN IF NOT EXISTS area_length_m NUMERIC(10,2),      -- ยาว (เมตร)
ADD COLUMN IF NOT EXISTS planting_rows INTEGER,            -- จำนวนแถวปลูก
ADD COLUMN IF NOT EXISTS pump_size_hp NUMERIC(10,2),       -- ขนาดปั๊มน้ำ (แรงม้า)
ADD COLUMN IF NOT EXISTS water_source TEXT,                -- แหล่งน้ำ (บ่อบาดาล, ลำธาร ฯลฯ)
ADD COLUMN IF NOT EXISTS last_inspection_date DATE;        -- วันที่ตรวจล่าสุด (อัปเดตจาก log)

-- 2. Create zone_inspection_logs table
CREATE TABLE IF NOT EXISTS public.zone_inspection_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zone_id UUID NOT NULL REFERENCES public.stock_zones(id) ON DELETE CASCADE,

    check_date DATE NOT NULL,              -- วันที่ตรวจ
    tree_count INTEGER,                    -- จำนวนต้นที่ตรวจ/ประมาณ
    trunk_size_inch NUMERIC(5,2),         -- ขนาดลำต้นเฉลี่ย (นิ้ว)
    height_m NUMERIC(5,2),                -- ความสูงเฉลี่ย (เมตร)
    pot_size_inch NUMERIC(5,2),           -- ขนาดกระถางปัจจุบัน (นิ้ว)

    -- ใช้เป็น note ทั้ง "ตรวจอะไร" + "บำรุงอะไร"
    maintenance_notes TEXT,               -- เช่น ตัดหญ้า, ใส่ปุ๋ยสูตร 15-15-15, เปลี่ยนกระถาง 10" → 14"

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) -- Assuming auth.users for profiles/users
);

-- 3. Trigger to update stock_zones.last_inspection_date
CREATE OR REPLACE FUNCTION public.update_zone_last_inspection()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stock_zones
  SET last_inspection_date = NEW.check_date
  WHERE id = NEW.zone_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_zone_last_inspection ON public.zone_inspection_logs;

CREATE TRIGGER trg_zone_last_inspection
AFTER INSERT ON public.zone_inspection_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_zone_last_inspection();

-- 4. View for latest inspection
CREATE OR REPLACE VIEW public.view_zone_latest_inspection AS
SELECT
    z.id AS zone_id,
    z.name AS zone_name,
    li.id AS latest_log_id,
    li.check_date,
    li.tree_count,
    li.trunk_size_inch,
    li.height_m,
    li.pot_size_inch,
    li.maintenance_notes
FROM public.stock_zones z
LEFT JOIN LATERAL (
    SELECT *
    FROM public.zone_inspection_logs l
    WHERE l.zone_id = z.id
    ORDER BY l.check_date DESC, l.created_at DESC
    LIMIT 1
) li ON TRUE;
