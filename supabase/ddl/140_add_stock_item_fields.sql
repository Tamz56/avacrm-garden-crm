-- 1. เพิ่มคอลัมน์ใหม่ใน stock_items (แบบ Idempotent)
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS trunk_size_inch smallint;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS pot_size_inch smallint;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS height_text text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS ready_date date;

-- 2. constraint ช่วงค่าขนาดลำต้น
ALTER TABLE public.stock_items DROP CONSTRAINT IF EXISTS chk_trunk_size_range;
ALTER TABLE public.stock_items
  ADD CONSTRAINT chk_trunk_size_range
  CHECK (
    trunk_size_inch IS NULL
    OR (trunk_size_inch BETWEEN 3 AND 20)
  );

-- 3. constraint ช่วงค่าขนาดกระถาง
ALTER TABLE public.stock_items DROP CONSTRAINT IF EXISTS chk_pot_size_range;
ALTER TABLE public.stock_items
  ADD CONSTRAINT chk_pot_size_range
  CHECK (
    pot_size_inch IS NULL
    OR (pot_size_inch BETWEEN 6 AND 20)
  );

-- 4. Update view definition
-- DROP VIEW ก่อนเพื่อแก้ปัญหา column mismatch / rename error
DROP VIEW IF EXISTS public.view_stock_overview CASCADE;

CREATE OR REPLACE VIEW public.view_stock_overview AS
SELECT
    i.id AS stock_item_id,
    s.id AS species_id,
    s.code AS species_code,
    s.name AS species_name,
    s.scientific_name,
    s.type AS species_type,
    z.id AS zone_id,
    z.name AS zone_name,
    z.farm_name,
    i.size_label,
    i.grade,
    i.quantity_available,
    i.quantity_reserved,
    i.base_price,
    i.status,
    i.trunk_size_inch,
    i.pot_size_inch,
    i.height_text,
    i.ready_date,
    i.created_at, -- เพิ่ม created_at เผื่อไว้ (ถ้ามีในตาราง) หรือถ้าไม่มีก็ลบออกได้ แต่ error แจ้งว่ามี
    i.updated_at  -- เพิ่ม updated_at เผื่อไว้
FROM public.stock_items i
JOIN public.stock_species s ON i.species_id = s.id
JOIN public.stock_zones z ON i.zone_id = z.id
WHERE s.is_active = true;
