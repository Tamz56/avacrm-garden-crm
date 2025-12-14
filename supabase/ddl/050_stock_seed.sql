-- SEED 1: ชนิดต้นไม้ (stock_species)
INSERT INTO public.stock_species (code, name, scientific_name, type, note)
VALUES
    ('SVA1', 'Silver Oak AVAONE', 'Grevillea robusta', 'ไม้ล้อม',
     'ไม้ยืนต้นโตเร็ว เหมาะสำหรับแนวป่า สวนป่า และพื้นที่โครงการ'),
    ('GVA1', 'Golden Oak AVAONE', 'Grevillea baileyana', 'ไม้ล้อม',
     'ใบสีทองเด่น เหมาะทำสวนโชว์ และโครงการที่ต้องการจุดเด่นด้านสีสัน')
ON CONFLICT (code) DO NOTHING;

-- SEED 2: โซนปลูก (stock_zones)
INSERT INTO public.stock_zones (code, name, farm_name, description)
VALUES
    ('K-A1', 'เข็ก – Zone A1', 'เข็ก', 'โซนต้นขนาดกลาง 4–6 นิ้ว'),
    ('K-B2', 'เข็ก – Zone B2', 'เข็ก', 'โซนต้นขนาด 6 นิ้วขึ้นไป'),
    ('K-C1', 'เข็ก – Zone C1', 'เข็ก', 'โซนต้นขนาด 8–10 นิ้ว'),
    ('K-D1', 'เข็ก – Zone D1', 'เข็ก', 'โซน Golden Oak ขนาด 4 นิ้ว'),
    ('K-D2', 'เข็ก – Zone D2', 'เข็ก', 'โซน Golden Oak ขนาด 6–8 นิ้ว')
ON CONFLICT (code) DO NOTHING;

-- SEED 3: สต็อกแยกตามขนาด / โซน (stock_items)
WITH sp AS (
    SELECT code, id FROM public.stock_species
),
zn AS (
    SELECT code, id FROM public.stock_zones
)
INSERT INTO public.stock_items (
    species_id, zone_id, size_label, grade,
    quantity_available, quantity_reserved, base_price, status
)
SELECT
    s.id, z.id, x.size_label, x.grade,
    x.quantity_available, x.quantity_reserved, x.base_price, x.status::public.stock_status
FROM (
    VALUES
        -- Silver Oak AVAONE
        ('SVA1','K-A1','4"',    NULL, 24, 4, 2500, 'available'),
        ('SVA1','K-B2','6"',    NULL, 18, 6, 3500, 'available'),
        ('SVA1','K-C1','8–10"', NULL,  4, 2, 5500, 'low'),

        -- Golden Oak AVAONE
        ('GVA1','K-D1','4"',    NULL, 20, 5, 3200, 'available'),
        ('GVA1','K-D2','6–8"',  NULL, 12, 5, 4200, 'low')
) AS x (sp_code, zn_code, size_label, grade, quantity_available, quantity_reserved, base_price, status)
JOIN sp s ON s.code = x.sp_code
JOIN zn z ON z.code = x.zn_code
ON CONFLICT (species_id, zone_id, size_label, grade) DO NOTHING;
