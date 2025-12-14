-- 331_create_view_deal_stock_picker.sql

-- View สำหรับ dropdown "เลือกต้นไม้ / ขนาด / โซน" ในฟอร์มดีล
-- แสดงเฉพาะ stock ที่พร้อมขาย (available_qty > 0)

CREATE OR REPLACE VIEW public.view_deal_stock_picker AS
SELECT
    l.species_id,
    l.species_name_th,
    l.species_name_en,
    l.species_code,

    l.size_label,
    l.height_label,
    l.grade_id,
    l.grade_name,
    l.grade_code,

    l.zone_id,
    l.zone_name,
    l.farm_name,

    l.available_qty,     -- จำนวนพร้อมขาย
    l.tagged_total_qty AS total_qty,
    l.reserved_qty,
    l.dig_ordered_qty

    -- TODO: เพิ่ม join กับ view ราคา ถ้าต้องการแสดงราคาใน dropdown
    -- p.unit_price,
    -- p.currency
FROM public.view_stock_zone_lifecycle l
-- LEFT JOIN public.view_stock_species_with_pricing p
--   ON p.species_id = l.species_id
--  AND p.size_label = l.size_label
--  AND p.grade_id   = l.grade_id
WHERE l.available_qty > 0;

GRANT SELECT ON public.view_deal_stock_picker TO authenticated;
