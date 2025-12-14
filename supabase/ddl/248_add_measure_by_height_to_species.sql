-- 248_add_measure_by_height_to_species.sql

ALTER TABLE public.stock_species
ADD COLUMN IF NOT EXISTS measure_by_height boolean NOT NULL DEFAULT false;

-- Optional: Update existing data (Example)
-- UPDATE public.stock_species
-- SET measure_by_height = true
-- WHERE name_th IN ('สนดินสอ', 'อิตาเลียนไซเปรส');
