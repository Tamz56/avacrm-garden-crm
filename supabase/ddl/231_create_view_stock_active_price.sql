-- supabase/ddl/231_create_view_stock_active_price.sql

DROP VIEW IF EXISTS public.view_stock_active_price;

CREATE OR REPLACE VIEW public.view_stock_active_price AS
SELECT DISTINCT ON (species_id, size_label, grade)
    id,
    species_id,
    size_label,
    grade,
    base_price,
    currency,
    valid_from,
    valid_to
FROM public.stock_price_list
WHERE is_active = TRUE
ORDER BY species_id, size_label, grade, valid_from DESC;
