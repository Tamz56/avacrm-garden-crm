-- ============================================================
-- SQL เช็กผลลัพธ์หลังปิดดีล (ใช้ deal_code แทน UUID)
-- แทน 'DEAL-2025-XXX' ด้วยโค้ดดีลจริงที่ต้องการเช็ก
-- ============================================================

-- ========================================
-- 0) หา UUID จาก deal_code
-- ========================================
SELECT 
  id,
  deal_code,
  title,
  stage,
  status,
  total_amount,
  customer_name
FROM public.deals
WHERE deal_code = 'DEAL-2025-014'  -- เปลี่ยนเป็นโค้ดดีลที่ต้องการ
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 1) เช็ก stock_movements (ใช้ deal_code)
-- ========================================
WITH target_deal AS (
  SELECT id FROM public.deals WHERE deal_code = 'DEAL-2025-014'
)
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
WHERE sm.related_deal_id = (SELECT id FROM target_deal)
ORDER BY sm.created_at DESC;

-- คาดหวัง: เห็นแถว movement_type='OUT'

-- ========================================
-- 2) เช็กคงเหลือ stock_items หลังตัด
-- ========================================
WITH target_deal AS (
  SELECT id FROM public.deals WHERE deal_code = 'DEAL-2025-014'
)
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
WHERE di.deal_id = (SELECT id FROM target_deal)
ORDER BY ss.name, si.size_label;

-- คาดหวัง: quantity_available ลดลงแล้ว

-- ========================================
-- 3) เช็ก deal_commissions
-- ========================================
WITH target_deal AS (
  SELECT id FROM public.deals WHERE deal_code = 'DEAL-2025-014'
)
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
WHERE dc.deal_id = (SELECT id FROM target_deal)
ORDER BY dc.role;

-- คาดหวัง: มี sales_agent และ team_leader

-- ========================================
-- 4) สรุปภาพรวม
-- ========================================
WITH target_deal AS (
  SELECT id FROM public.deals WHERE deal_code = 'DEAL-2025-014'
)
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
WHERE d.id = (SELECT id FROM target_deal)
GROUP BY d.id, d.deal_code, d.title, d.stage, d.total_amount;
