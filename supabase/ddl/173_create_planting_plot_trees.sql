-- 173_create_planting_plot_trees.sql

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.planting_plot_trees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id uuid NOT NULL REFERENCES public.stock_zones(id) ON DELETE CASCADE,
    species_id uuid NOT NULL REFERENCES public.stock_species(id) ON DELETE RESTRICT,
    size_label text,
    
    planted_count integer NOT NULL DEFAULT 0,
    planted_date date,
    
    -- Metadata
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add source columns to stock_items (needed for RPC)
ALTER TABLE public.stock_items
ADD COLUMN IF NOT EXISTS source_type text,
ADD COLUMN IF NOT EXISTS source_plot_id uuid REFERENCES public.stock_zones(id),
ADD COLUMN IF NOT EXISTS source_plot_tree_id uuid REFERENCES public.planting_plot_trees(id);

-- 3. Seed data from stock_items (where zone_id IS NOT NULL)
-- Assuming stock_items with zone_id are "Aggregate" records
INSERT INTO public.planting_plot_trees (
    plot_id,
    species_id,
    size_label,
    planted_count,
    planted_date,
    created_at,
    updated_at
)
SELECT
    si.zone_id,
    si.species_id,
    si.size_label,
    SUM(si.quantity_available), -- Assuming this is the count
    MIN(si.created_at)::date,
    MIN(si.created_at),
    NOW()
FROM public.stock_items si
WHERE si.zone_id IS NOT NULL
GROUP BY si.zone_id, si.species_id, si.size_label;

-- 4. Enable RLS
ALTER TABLE public.planting_plot_trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.planting_plot_trees
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON public.planting_plot_trees
    FOR ALL TO authenticated USING (true);

GRANT ALL ON public.planting_plot_trees TO authenticated;

NOTIFY pgrst, 'reload schema';
