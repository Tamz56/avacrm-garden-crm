-- 170_create_stock_products.sql

CREATE TABLE IF NOT EXISTS public.stock_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- รหัสสินค้าแบบสั้น เช่น GOLD-OAK-4IN
    code text NOT NULL UNIQUE,

    -- พันธุ์ (เชื่อมกับ stock_species เดิม)
    species_id uuid NOT NULL REFERENCES public.stock_species(id) ON DELETE RESTRICT,

    -- ขนาดมาตรฐาน เช่น 3", 4", 5", 1-2", 10-12"
    size_label text NOT NULL,

    -- ชื่อสินค้าไว้โชว์ใน UI / รายงาน
    display_name_th text,
    display_name_en text,

    -- ราคา default ต่อต้น (เผื่ออนาคต)
    default_price numeric(12, 2),

    is_active boolean NOT NULL DEFAULT true,
    notes text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1 พันธุ์ + 1 ขนาด = product เดียว (กันซ้ำ)
ALTER TABLE public.stock_products
    ADD CONSTRAINT stock_products_species_size_uniq
    UNIQUE (species_id, size_label);

CREATE INDEX IF NOT EXISTS idx_stock_products_species
    ON public.stock_products(species_id);

GRANT SELECT, INSERT, UPDATE ON public.stock_products TO authenticated;
