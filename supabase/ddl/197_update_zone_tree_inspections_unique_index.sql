DROP INDEX IF EXISTS zone_tree_inspections_unique;

CREATE UNIQUE INDEX IF NOT EXISTS zone_tree_inspections_unique
ON public.zone_tree_inspections (zone_id, species_id, size_label, grade);
