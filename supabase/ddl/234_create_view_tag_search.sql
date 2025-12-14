DROP VIEW IF EXISTS public.view_tag_search;

CREATE OR REPLACE VIEW public.view_tag_search AS
SELECT
    t.id,
    t.tag_code,
    t.status,
    t.size_label,
    t.grade,
    t.planting_row,
    t.planting_position,
    t.notes,                  -- ชื่อใน schema จริงตอนนี้
    t.zone_id,
    z.name      AS zone_name,
    z.farm_name AS farm_name,
    t.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    s.code      AS species_code,
    t.deal_id,
    d.deal_code AS deal_code, -- ✅ Fix: deals table uses deal_code, not code
    -- ✅ Fix: Get dig_order info via dig_order_items
    doi.dig_order_id,
    o.code      AS dig_order_code,
    o.dig_purpose,
    -- ✅ ฟิลด์ใหม่สำหรับต้นพิเศษ
    t.tree_category,
    t.display_name,
    t.feature_notes,
    t.primary_image_url,
    t.extra_image_urls,
    t.created_at,
    t.updated_at
FROM public.tree_tags t
JOIN public.stock_zones   z ON z.id = t.zone_id
JOIN public.stock_species s ON s.id = t.species_id
LEFT JOIN public.deals      d ON d.id = t.deal_id
LEFT JOIN public.dig_order_items doi ON doi.tag_id = t.id
LEFT JOIN public.dig_orders o ON o.id = doi.dig_order_id;
