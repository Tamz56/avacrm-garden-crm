-- ============================================================
-- 1. ENUMS & TYPES
-- ============================================================
DO $$ BEGIN
    CREATE TYPE public.stock_status AS ENUM ('available', 'low', 'out', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Table: stock_species
CREATE TABLE IF NOT EXISTS public.stock_species (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    scientific_name text,
    type text,
    note text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table: stock_zones
CREATE TABLE IF NOT EXISTS public.stock_zones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    farm_name text,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table: stock_items
CREATE TABLE IF NOT EXISTS public.stock_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    species_id uuid REFERENCES public.stock_species(id) ON DELETE CASCADE,
    zone_id uuid REFERENCES public.stock_zones(id) ON DELETE SET NULL,
    size_label text NOT NULL,
    grade text,
    quantity_available integer DEFAULT 0,
    quantity_reserved integer DEFAULT 0,
    base_price numeric(10, 2),
    status public.stock_status DEFAULT 'available',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(species_id, zone_id, size_label, grade)
);

-- ============================================================
-- 3. VIEWS
-- ============================================================

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
    i.status
FROM public.stock_items i
JOIN public.stock_species s ON i.species_id = s.id
JOIN public.stock_zones z ON i.zone_id = z.id
WHERE s.is_active = true;

-- ============================================================
-- 4. SEED DATA
-- ============================================================

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
