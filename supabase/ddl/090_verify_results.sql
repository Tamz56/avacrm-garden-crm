-- ============================================================
-- SQL สำหรับเช็กผลลัพธ์หลังปิดดีลสำเร็จ
-- แทน <DEAL_ID> ด้วย UUID ของดีลที่เพิ่งปิด
-- ============================================================

-- ========================================
-- 1) เช็ก UNIQUE constraint ว่าถูกสร้างแล้ว
-- ========================================
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND contype = 'u'
ORDER BY conname;

-- คาดหวัง: เห็น deal_commissions_deal_id_role_uniq

-- ========================================
-- 2) ทดสอบเรียก RPC (ใส่ deal_id จริง)
-- ========================================
-- SELECT public.close_deal_and_update_stock('<DEAL_ID>');

-- ผลลัพธ์ที่คาดหวัง:
-- {"ok": true, "message": "ปิดดีลและปรับสต็อกเรียบร้อยแล้ว"}

-- ========================================
-- 3) เช็ก stock_movements ของดีลนี้
-- ========================================
SELECT 
  sm.id,
  sm.movement_type,
  sm.quantity,
  sm.note,
  sm.created_at,
  -- ข้อมูลสต็อก
  ss.name AS species_name,
  ss.code AS species_code,
  si.size_label,
  sz.name AS zone_name
FROM public.stock_movements sm
LEFT JOIN public.stock_items si ON sm.stock_item_id = si.id
LEFT JOIN public.stock_species ss ON si.species_id = ss.id
LEFT JOIN public.stock_zones sz ON si.zone_id = sz.id
WHERE sm.related_deal_id = '<DEAL_ID>'
ORDER BY sm.created_at DESC;

-- คาดหวัง: เห็นแถว movement_type='OUT' ตามจำนวนรายการในดีล

-- ========================================
-- 4) เช็กคงเหลือ stock_items หลังตัด
-- ========================================
SELECT
  si.id,
  ss.name AS species_name,
  ss.code AS species_code,
  si.size_label,
  sz.name AS zone_name,
  si.quantity_available AS คงเหลือปัจจุบัน,
  di.quantity AS จำนวนที่ขาย,
  si.updated_at
FROM public.stock_items si
JOIN public.deal_items di ON di.stock_item_id = si.id
LEFT JOIN public.stock_species ss ON si.species_id = ss.id
LEFT JOIN public.stock_zones sz ON si.zone_id = sz.id
WHERE di.deal_id = '<DEAL_ID>'
ORDER BY ss.name, si.size_label;

-- คาดหวัง: quantity_available ลดลงตามจำนวนที่ขาย

-- ========================================
-- 5) เช็กสถานะดีล
-- ========================================
SELECT
  id,
  deal_code,
  title,
  stage,
  status,
  total_amount,
  customer_name,
  updated_at
FROM public.deals
WHERE id = '<DEAL_ID>';

-- คาดหวัง: stage='won'

-- ========================================
-- 6) เช็ก deal_commissions
-- ========================================
SELECT
  dc.id,
  dc.role,
  dc.profile_id,
  p.full_name AS sales_name,
  dc.commission_rate,
  dc.base_amount,
  dc.commission_amount,
  dc.status,
  dc.created_at
FROM public.deal_commissions dc
LEFT JOIN public.profiles p ON dc.profile_id = p.id
WHERE dc.deal_id = '<DEAL_ID>'
ORDER BY dc.role;

-- คาดหวัง: มี commission records สำหรับ sales_agent และ team_leader

-- ========================================
-- 7) สรุปภาพรวมทั้งหมด
-- ========================================
SELECT
  d.deal_code,
  d.title,
  d.stage,
  d.total_amount,
  COUNT(DISTINCT sm.id) AS จำนวน_movements,
  COUNT(DISTINCT di.id) AS จำนวนรายการสินค้า,
  COUNT(DISTINCT dc.id) AS จำนวน_commissions,
  SUM(sm.quantity) AS รวมจำนวนที่หัก,
  SUM(dc.commission_amount) AS รวมคอมมิชชัน
FROM public.deals d
LEFT JOIN public.stock_movements sm ON sm.related_deal_id = d.id
LEFT JOIN public.deal_items di ON di.deal_id = d.id
LEFT JOIN public.deal_commissions dc ON dc.deal_id = d.id
WHERE d.id = '<DEAL_ID>'
GROUP BY d.id, d.deal_code, d.title, d.stage, d.total_amount;

-- ========================================
-- 8) ทดสอบกันยิงซ้ำ (ควรได้ ok=false)
-- ========================================
-- รันอีกครั้งกับดีลเดิม ควรได้ message: "ดีลนี้ถูกตัดสต็อกไปแล้ว"
-- SELECT public.close_deal_and_update_stock('<DEAL_ID>');
