-- 171_backfill_stock_products_and_link_stock_items.sql

-- 1) เพิ่มคอลัมน์ product_id (ยังไม่ NOT NULL ก่อน)
ALTER TABLE public.stock_items
ADD COLUMN IF NOT EXISTS product_id uuid;

-- 2) เตรียม size_label ให้สะอาดเผื่อกรณียังมี '' หรือ NULL
--    (ถ้าคุณ normalize ไปแล้ว บล็อกนี้ก็จะไม่เปลี่ยนอะไร)
WITH normalized AS (
    SELECT DISTINCT
        species_id,
        COALESCE(NULLIF(trim(size_label), ''), 'ไม่ระบุ') AS size_label_norm
    FROM public.stock_items
    WHERE species_id IS NOT NULL
)
INSERT INTO public.stock_products (
    species_id,
    size_label,
    code,
    display_name_th,
    display_name_en
)
SELECT
    n.species_id,
    n.size_label_norm AS size_label,
    -- code: species_code + '-' + size (ตัดอักขระแปลก ๆ ออก)
    -- ใช้ ss.name แทน ss.code เพราะไม่แน่ใจว่ามี column code ไหม
    LOWER(
        REGEXP_REPLACE(ss.name, '\s+', '-', 'g') || '-' ||
        REGEXP_REPLACE(n.size_label_norm, '[^A-Za-z0-9]+', '', 'g')
    ) AS code,
    ss.name AS display_name_th,
    ss.name AS display_name_en
FROM normalized n
JOIN public.stock_species ss ON ss.id = n.species_id
ON CONFLICT (species_id, size_label) DO NOTHING;

-- 3) อัปเดต stock_items ให้มี product_id
UPDATE public.stock_items si
SET product_id = sp.id
FROM public.stock_products sp
WHERE sp.species_id = si.species_id
  AND sp.size_label = COALESCE(NULLIF(trim(si.size_label), ''), 'ไม่ระบุ')
  AND si.product_id IS NULL;

-- (optional) ดูว่ามียอดที่ product_id ยังว่างอยู่ไหม
-- SELECT COUNT(*) AS missing_product
-- FROM public.stock_items
-- WHERE product_id IS NULL;

-- 4) บังคับให้ทุกต้นต้องมี product_id และผูก FK
-- หมายเหตุ: รันส่วนนี้เมื่อมั่นใจว่า update ครบแล้วเท่านั้น
-- ALTER TABLE public.stock_items
--     ALTER COLUMN product_id SET NOT NULL;

-- ALTER TABLE public.stock_items
--     ADD CONSTRAINT stock_items_product_fkey
--     FOREIGN KEY (product_id) REFERENCES public.stock_products(id)
--     ON DELETE RESTRICT;

-- CREATE INDEX IF NOT EXISTS idx_stock_items_product
--     ON public.stock_items(product_id);
