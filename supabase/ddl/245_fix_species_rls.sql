-- 245_fix_species_rls.sql

ALTER TABLE public.stock_species ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "species_select_auth" ON public.stock_species;
DROP POLICY IF EXISTS "species_insert_auth" ON public.stock_species;

CREATE POLICY "species_select_auth"
ON public.stock_species
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "species_insert_auth"
ON public.stock_species
FOR INSERT
TO authenticated
WITH CHECK (true);
