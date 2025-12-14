-- ============================================================
-- สร้าง View: deal_stock_summary
-- สำหรับแสดงสรุปการใช้สต็อกในแต่ละดีล
-- ============================================================

CREATE OR REPLACE VIEW public.deal_stock_summary AS
SELECT
  d.id AS deal_id,
  d.deal_code,
  d.title AS deal_title,
  di.id AS deal_item_id,
  di.quantity AS deal_quantity,
  di.stock_item_id,
  si.size_label,
  sz.name AS zone_name,
  si.quantity_available AS stock_quantity_available,
  COALESCE(SUM(sm.quantity), 0) AS total_moved_for_deal
FROM public.deals d
JOIN public.deal_items di ON di.deal_id = d.id
LEFT JOIN public.stock_items si ON di.stock_item_id = si.id
LEFT JOIN public.stock_zones sz ON si.zone_id = sz.id
LEFT JOIN public.stock_movements sm 
  ON sm.stock_item_id = di.stock_item_id 
  AND sm.related_deal_id = d.id
  AND sm.movement_type = 'OUT'
GROUP BY 
  d.id, d.deal_code, d.title,
  di.id, di.quantity, di.stock_item_id,
  si.size_label, sz.name, si.quantity_available;

-- Grant permissions
GRANT SELECT ON public.deal_stock_summary TO authenticated;

-- Add comment
COMMENT ON VIEW public.deal_stock_summary IS 
'สรุปการใช้สต็อกในแต่ละดีล แสดงจำนวนที่สั่งขาย จำนวนที่ตัดจริง และคงเหลือ';

-- ============================================================
-- ทดสอบ View
-- ============================================================
-- SELECT * FROM public.deal_stock_summary LIMIT 10;
