-- 246_relax_species_code_constraint.sql

-- Allow code to be NULL (optional)
ALTER TABLE public.stock_species ALTER COLUMN code DROP NOT NULL;
