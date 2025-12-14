-- 244_add_rls_planting_plot_inventory.sql

-- Enable RLS
ALTER TABLE public.planting_plot_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.planting_plot_inventory;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.planting_plot_inventory;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.planting_plot_inventory;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.planting_plot_inventory;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
ON public.planting_plot_inventory
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON public.planting_plot_inventory
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON public.planting_plot_inventory
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
ON public.planting_plot_inventory
FOR DELETE
TO authenticated
USING (true);
