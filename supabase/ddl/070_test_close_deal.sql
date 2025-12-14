-- ตัวอย่าง SQL เช็กผลลัพธ์หลังรัน RPC close_deal_and_update_stock

-- ========================================
-- 1) ทดสอบเรียก RPC
-- ========================================
-- แทน <DEAL_ID_HERE> ด้วย UUID ของดีลจริง
SELECT public.close_deal_and_update_stock('<DEAL_ID_HERE>');

-- ผลลัพธ์ที่คาดหวัง:
-- {"ok": true, "message": "ปิดดีลและปรับสต็อกเรียบร้อยแล้ว"}

-- ========================================
-- 2) ดูรายการ stock_movements ของดีลนี้
-- ========================================
SELECT 
  sm.id,
  sm.stock_item_id,
  sm.movement_type,
  sm.quantity,
  sm.related_deal_id,
  sm.note,
  sm.created_at,
  -- ข้อมูลสต็อกที่เกี่ยวข้อง
  ss.name AS species_name,
  si.size_label,
  sz.name AS zone_name
FROM public.stock_movements sm
LEFT JOIN public.stock_items si ON sm.stock_item_id = si.id
LEFT JOIN public.stock_species ss ON si.species_id = ss.id
LEFT JOIN public.stock_zones sz ON si.zone_id = sz.id
WHERE sm.related_deal_id = '<DEAL_ID_HERE>'
ORDER BY sm.created_at DESC;

-- ========================================
-- 3) ดูคงเหลือใน stock_items หลังตัด
-- ========================================
SELECT
  si.id,
  ss.name AS species_name,
  si.size_label,
  sz.name AS zone_name,
  si.quantity_available AS คงเหลือ,
  si.quantity_reserved AS ถูกจอง,
  di.quantity AS จำนวนที่ขาย,
  si.updated_at
FROM public.stock_items si
JOIN public.deal_items di ON di.stock_item_id = si.id
LEFT JOIN public.stock_species ss ON si.species_id = ss.id
LEFT JOIN public.stock_zones sz ON si.zone_id = sz.id
WHERE di.deal_id = '<DEAL_ID_HERE>'
ORDER BY ss.name, si.size_label;

-- ========================================
-- 4) ดูสถานะดีล (ควรเป็น stage='won')
-- ========================================
SELECT
  id,
  deal_code,
  title,
  stage,
  status,
  total_amount,
  updated_at
FROM public.deals
WHERE id = '<DEAL_ID_HERE>';

-- ========================================
-- 5) ดูรายการสินค้าในดีล
-- ========================================
SELECT
  di.id,
  di.description,
  di.quantity,
  di.unit_price,
  di.line_total,
  di.stock_item_id,
  -- ข้อมูลสต็อก
  ss.name AS species_name,
  si.size_label,
  si.quantity_available AS คงเหลือปัจจุบัน
FROM public.deal_items di
LEFT JOIN public.stock_items si ON di.stock_item_id = si.id
LEFT JOIN public.stock_species ss ON si.species_id = ss.id
WHERE di.deal_id = '<DEAL_ID_HERE>'
ORDER BY di.created_at;

-- ========================================
-- 6) ทดสอบกันยิงซ้ำ (ควรได้ ok=false)
-- ========================================
-- รันอีกครั้งกับดีลเดิม ควรได้ message: "ดีลนี้ถูกตัดสต็อกไปแล้ว"
SELECT public.close_deal_and_update_stock('<DEAL_ID_HERE>');
