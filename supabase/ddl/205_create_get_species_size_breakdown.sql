-- 205_create_get_species_size_breakdown.sql

CREATE OR REPLACE FUNCTION public.get_species_size_breakdown(
    p_species_id uuid
)
RETURNS TABLE (
    size_label text,
    total_items bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        COALESCE(i.size_label, 'ไม่ระบุ') AS size_label,
        COUNT(*) AS total_items
    FROM public.stock_items i
    WHERE i.species_id = p_species_id
    GROUP BY COALESCE(i.size_label, 'ไม่ระบุ')
    ORDER BY COALESCE(i.size_label, 'ไม่ระบุ');
$$;
