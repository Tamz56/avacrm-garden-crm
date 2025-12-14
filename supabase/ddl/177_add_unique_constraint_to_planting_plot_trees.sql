-- 177_add_unique_constraint_to_planting_plot_trees.sql

-- Add unique constraint to support UPSERT
ALTER TABLE public.planting_plot_trees
ADD CONSTRAINT planting_plot_trees_plot_id_species_id_size_label_key
UNIQUE (plot_id, species_id, size_label);

NOTIFY pgrst, 'reload schema';
