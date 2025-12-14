-- 249_add_price_per_meter.sql
-- Run 249_01_fix_enums.sql FIRST!

-- 1. Add height_label to stock_items
ALTER TABLE public.stock_items
ADD COLUMN IF NOT EXISTS height_label text;

-- 2. Update unique constraint on stock_items to include height_label
-- First, drop the existing constraint
ALTER TABLE public.stock_items
DROP CONSTRAINT IF EXISTS stock_items_species_id_zone_id_size_label_grade_key;

-- Then add the new one (treating NULL height_label as unique in combination with others is tricky in SQL standard unique constraints, 
-- but Postgres UNIQUE allows multiple NULLs. However, for our logic, we probably want distinct SKU per height.
-- Let's assume height_label can be NULL (for old items) or a value.
-- If we want to enforce uniqueness including height, we can add it.
ALTER TABLE public.stock_items
ADD CONSTRAINT stock_items_species_id_zone_id_size_label_grade_height_key 
UNIQUE (species_id, zone_id, size_label, grade, height_label);


-- 3. Update view_stock_overview to include height_label
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
    z.plot_type,
    i.size_label,
    i.height_label, -- Added
    i.grade,
    i.quantity_available,
    i.quantity_reserved,
    i.base_price,
    i.status
FROM public.stock_items i
JOIN public.stock_species s ON i.species_id = s.id
JOIN public.stock_zones z ON i.zone_id = z.id
WHERE s.is_active = true;


-- 4. Update view_stock_overview_v2 to include height_label
DROP VIEW IF EXISTS public.view_stock_overview_v2 CASCADE;

CREATE OR REPLACE VIEW public.view_stock_overview_v2 AS
WITH base AS (
    SELECT
        si.id,
        si.species_id,
        ss.name_th       AS species_name_th,
        ss.name_en       AS species_name_en,
        ss.code          AS species_code,
        si.size_label    AS size_label,
        si.height_label  AS height_label, -- Added
        si.zone_id,
        sz.name          AS zone_name,
        sz.code          AS zone_code,
        sz.plot_type,
        si.status        AS stock_status
    FROM public.stock_items si
    JOIN public.stock_species ss ON ss.id = si.species_id
    LEFT JOIN public.stock_zones sz ON sz.id = si.zone_id
)
SELECT
    species_id,
    species_name_th,
    species_name_en,
    species_code,
    size_label,
    height_label, -- Added
    zone_id,
    zone_name,
    zone_code,
    plot_type,

    COUNT(*)::int                                         AS total_trees,

    COUNT(*) FILTER (WHERE stock_status = 'available')::int  AS available_trees,
    COUNT(*) FILTER (WHERE stock_status = 'reserved')::int   AS reserved_trees,
    COUNT(*) FILTER (WHERE stock_status = 'shipped')::int    AS shipped_trees,
    COUNT(*) FILTER (
        WHERE stock_status NOT IN ('available','reserved','shipped')
    )::int                                                  AS other_trees
FROM base
GROUP BY
    species_id,
    species_name_th,
    species_name_en,
    species_code,
    size_label,
    height_label, -- Added
    zone_id,
    zone_name,
    zone_code,
    plot_type;

-- Re-grant permissions (since DROP CASCADE might have removed them)
GRANT SELECT ON public.view_stock_overview TO authenticated;
GRANT SELECT ON public.view_stock_overview_v2 TO authenticated;



-- 5. Add columns to deal_items
ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS price_type text NOT NULL DEFAULT 'per_tree', -- 'per_tree' or 'per_meter'
ADD COLUMN IF NOT EXISTS height_m numeric(10,2),
ADD COLUMN IF NOT EXISTS price_per_meter numeric(12,2),
ADD COLUMN IF NOT EXISTS line_total numeric(14,2);


-- 6. Create species_price_rate table
CREATE TABLE IF NOT EXISTS public.species_price_rate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id uuid NOT NULL REFERENCES public.stock_species(id),
  price_per_meter numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'THB',
  channel text,                       -- wholesale / retail / project ...
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to   date,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for species_price_rate
ALTER TABLE public.species_price_rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read species_price_rate"
ON public.species_price_rate FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert species_price_rate"
ON public.species_price_rate FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update species_price_rate"
ON public.species_price_rate FOR UPDATE TO authenticated USING (true);

