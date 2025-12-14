-- 194_upgrade_zone_status_tracking.sql

-- 1. Upgrade zone_digup_orders table
ALTER TABLE public.zone_digup_orders
ADD COLUMN IF NOT EXISTS species_id UUID REFERENCES public.stock_species(id),
ADD COLUMN IF NOT EXISTS size_label TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned'
  CHECK (status IN ('planned', 'in_progress', 'done', 'cancelled'));

-- 2. Create zone_tree_losses table
CREATE TABLE IF NOT EXISTS public.zone_tree_losses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES public.stock_zones(id),
    species_id UUID NOT NULL REFERENCES public.stock_species(id),
    size_label TEXT,
    loss_date DATE NOT NULL,
    qty INTEGER NOT NULL,
    cause TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_zone_tree_losses_updated_at ON public.zone_tree_losses;
CREATE TRIGGER set_zone_tree_losses_updated_at
BEFORE UPDATE ON public.zone_tree_losses
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

GRANT ALL ON public.zone_tree_losses TO authenticated;
GRANT ALL ON public.zone_tree_losses TO service_role;

-- 3. Update view_zone_tree_inventory_flow
DROP VIEW IF EXISTS public.view_zone_tree_inventory_flow;

CREATE OR REPLACE VIEW public.view_zone_tree_inventory_flow AS
WITH digup_stats AS (
    SELECT
        zone_id,
        species_id,
        size_label,
        COALESCE(SUM(qty) FILTER (WHERE status = 'done'), 0) AS dugup_done_qty,
        COALESCE(SUM(qty) FILTER (WHERE status = 'in_progress'), 0) AS dugup_in_progress_qty,
        COALESCE(SUM(qty) FILTER (WHERE status = 'planned'), 0) AS dugup_planned_qty
    FROM public.zone_digup_orders
    WHERE status != 'cancelled'
    GROUP BY zone_id, species_id, size_label
),
loss_stats AS (
    SELECT
        zone_id,
        species_id,
        size_label,
        COALESCE(SUM(qty), 0) AS dead_qty
    FROM public.zone_tree_losses
    GROUP BY zone_id, species_id, size_label
)
SELECT
    -- ใช้ plot_id เป็น zone_id อย่างที่เราใช้กันในระบบ
    ppt.plot_id AS zone_id,
    ppt.plot_id AS planting_plot_id,
    ppt.id      AS plot_tree_id,

    ppt.species_id,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en,
    ppt.size_label,

    -- จำนวนปลูก
    ppt.planted_count,

    -- Digup Counts (จาก zone_digup_orders)
    COALESCE(ds.dugup_done_qty,        0) AS dugup_done_qty,
    COALESCE(ds.dugup_in_progress_qty, 0) AS dugup_in_progress_qty,
    COALESCE(ds.dugup_planned_qty,     0) AS dugup_planned_qty,

    -- Loss Count (ต้นตาย)
    COALESCE(ls.dead_qty, 0) AS dead_qty,

    -- Available to Order (เหลือให้ "สั่งขุด" ได้)
    -- Logic: ปลูก - ขุดแล้ว - ตาย - กำลังขุด - แผนขุด
    GREATEST(
        0,
        ppt.planted_count
        - COALESCE(ds.dugup_done_qty,        0)
        - COALESCE(ls.dead_qty,              0)
        - COALESCE(ds.dugup_in_progress_qty, 0)
        - COALESCE(ds.dugup_planned_qty,     0)
    ) AS available_to_order,

    -- Remaining in Ground (ของจริงที่ยังยืนอยู่ในแปลง)
    -- ปลูก - ขุดแล้ว - ตาย (ไม่หัก in_progress / planned เพราะยังอยู่บนแปลง)
    GREATEST(
        0,
        ppt.planted_count
        - COALESCE(ds.dugup_done_qty, 0)
        - COALESCE(ls.dead_qty,       0)
    ) AS remaining_in_ground

FROM public.planting_plot_trees ppt
JOIN public.stock_zones   z ON ppt.plot_id = z.id
LEFT JOIN public.stock_species s ON ppt.species_id = s.id
LEFT JOIN digup_stats ds
  ON ds.zone_id    = ppt.plot_id
 AND ds.species_id = ppt.species_id
 AND ds.size_label = ppt.size_label
LEFT JOIN loss_stats ls
  ON ls.zone_id    = ppt.plot_id
 AND ls.species_id = ppt.species_id
 AND ls.size_label = ppt.size_label;

GRANT SELECT ON public.view_zone_tree_inventory_flow TO authenticated;

NOTIFY pgrst, 'reload schema';
