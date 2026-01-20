-- 401_add_preorder_to_deal_items.sql
-- เพิ่มคอลัมน์ preorder ใน deal_items + FK ย้อนกลับ dig_plans.deal_item_id
-- Created: 2026-01-18

-- 1) Add preorder columns to deal_items
ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'from_stock' 
    CHECK (source_type IN ('from_stock','preorder_from_zone','needs_confirm'));

ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS preorder_zone_id UUID NULL;

ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS preorder_plot_id UUID NULL;

ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS size_label_preorder TEXT NULL;

ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS lead_time_days INT DEFAULT 30;

ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS expected_ready_date DATE NULL;

ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS unit_price_estimate NUMERIC NULL;

ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS preorder_notes TEXT NULL;

ALTER TABLE public.deal_items
ADD COLUMN IF NOT EXISTS dig_plan_id UUID NULL;

-- 2) species_id - เช็คก่อนว่ามีอยู่แล้วหรือไม่
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deal_items' 
    AND column_name = 'species_id'
  ) THEN
    ALTER TABLE public.deal_items ADD COLUMN species_id UUID NULL;
    
    -- FK species_id -> stock_species (เฉพาะถ้าเพิ่มคอลัมน์ใหม่)
    ALTER TABLE public.deal_items
    ADD CONSTRAINT fk_deal_items_species FOREIGN KEY (species_id) 
        REFERENCES public.stock_species(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) FK constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_deal_items_preorder_zone') THEN
    ALTER TABLE public.deal_items
    ADD CONSTRAINT fk_deal_items_preorder_zone FOREIGN KEY (preorder_zone_id) 
        REFERENCES public.stock_zones(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_deal_items_dig_plan') THEN
    ALTER TABLE public.deal_items
    ADD CONSTRAINT fk_deal_items_dig_plan FOREIGN KEY (dig_plan_id) 
        REFERENCES public.dig_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4) FK ย้อนกลับ: dig_plans.deal_item_id -> deal_items(id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dig_plans_deal_item') THEN
    ALTER TABLE public.dig_plans
    ADD CONSTRAINT fk_dig_plans_deal_item FOREIGN KEY (deal_item_id) 
        REFERENCES public.deal_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5) Unique constraint: 1 deal_item -> 1 dig_plan
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_dig_plans_deal_item') THEN
    ALTER TABLE public.dig_plans
    ADD CONSTRAINT uq_dig_plans_deal_item UNIQUE (deal_item_id);
  END IF;
END $$;

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_deal_items_dig_plan ON public.deal_items(dig_plan_id);
CREATE INDEX IF NOT EXISTS idx_deal_items_source_type ON public.deal_items(source_type);
CREATE INDEX IF NOT EXISTS idx_deal_items_preorder_zone ON public.deal_items(preorder_zone_id);
CREATE INDEX IF NOT EXISTS idx_deal_items_species ON public.deal_items(species_id);

-- Comments
COMMENT ON COLUMN public.deal_items.source_type IS 'แหล่งที่มา: from_stock (สต็อกพร้อมขาย), preorder_from_zone (สั่งขุด 30 วัน), needs_confirm (รอยืนยัน)';
COMMENT ON COLUMN public.deal_items.expected_ready_date IS 'วันที่คาดว่าจะพร้อมส่ง (คำนวณจาก digup_date + lead_time_days)';
COMMENT ON COLUMN public.deal_items.unit_price_estimate IS 'ราคาประมาณการสำหรับ preorder (ยังไม่ยืนยัน)';
