-- 174_add_dig_columns_to_planting_plot_trees.sql

ALTER TABLE public.planting_plot_trees
ADD COLUMN IF NOT EXISTS planned_to_dig_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS moved_to_stock_count integer NOT NULL DEFAULT 0;

-- optional: view ช่วยคำนวณจำนวนคงเหลือในแปลง
CREATE OR REPLACE VIEW public.view_planting_plot_trees_ext AS
SELECT
  ppt.*,
  ss.name_th as species_name_th,
  ss.name_en as species_name_en,
  (ppt.planted_count - ppt.moved_to_stock_count) AS remaining_in_plot
FROM public.planting_plot_trees ppt
LEFT JOIN public.stock_species ss ON ppt.species_id = ss.id;

GRANT SELECT ON public.view_planting_plot_trees_ext TO authenticated;

NOTIFY pgrst, 'reload schema';
