-- 400_create_dig_plans.sql
-- ตาราง dig_plans สำหรับแผนขุดจากดีล (preorder)
-- Created: 2026-01-18

-- 1) Create dig_plans table
CREATE TABLE IF NOT EXISTS public.dig_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,              -- e.g. 'DP-2026-0001'
    zone_id UUID REFERENCES public.stock_zones(id) ON DELETE SET NULL,
    plot_id UUID NULL,
    species_id UUID REFERENCES public.stock_species(id) ON DELETE SET NULL,
    size_label TEXT,
    qty INT NOT NULL DEFAULT 1,
    digup_date DATE,                        -- วันเริ่มขุด (Ops เริ่มทำงาน)
    expected_ready_date DATE,               -- วันพร้อมส่ง (แสดงกับลูกค้า)
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
    notes TEXT,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    deal_item_id UUID NULL,                 -- FK จะเพิ่มใน 401 หลัง deal_items มีคอลัมน์แล้ว
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_dig_plans_deal_id ON public.dig_plans(deal_id);
CREATE INDEX IF NOT EXISTS idx_dig_plans_deal_item_id ON public.dig_plans(deal_item_id);
CREATE INDEX IF NOT EXISTS idx_dig_plans_zone_id ON public.dig_plans(zone_id);
CREATE INDEX IF NOT EXISTS idx_dig_plans_status ON public.dig_plans(status);
CREATE INDEX IF NOT EXISTS idx_dig_plans_digup_date ON public.dig_plans(digup_date);

-- 3) Trigger: updated_at (reuse existing function)
DROP TRIGGER IF EXISTS trg_dig_plans_updated_at ON public.dig_plans;
CREATE TRIGGER trg_dig_plans_updated_at
BEFORE UPDATE ON public.dig_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4) RLS with proper WITH CHECK
ALTER TABLE public.dig_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dig_plans_auth_all ON public.dig_plans;
CREATE POLICY dig_plans_auth_all ON public.dig_plans
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.dig_plans IS 'แผนขุดต้นไม้จากแปลง (สร้างอัตโนมัติเมื่อสร้างดีลแบบ preorder)';
COMMENT ON COLUMN public.dig_plans.digup_date IS 'วันเริ่มขุด - ทีม Ops เริ่มทำงาน';
COMMENT ON COLUMN public.dig_plans.expected_ready_date IS 'วันพร้อมส่ง - แสดงกับ Sales/ลูกค้า (digup_date + lead_time_days)';
COMMENT ON COLUMN public.dig_plans.deal_item_id IS 'FK ไป deal_items (จะเพิ่ม constraint ใน migration 401)';
