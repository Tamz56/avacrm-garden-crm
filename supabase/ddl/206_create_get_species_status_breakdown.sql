-- 206_create_get_species_status_breakdown.sql

CREATE OR REPLACE FUNCTION public.get_species_status_breakdown(
    p_species_id uuid
)
RETURNS TABLE (
    status stock_status,
    total_items bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        i.status,
        COUNT(*) AS total_items
    FROM public.stock_items i
    WHERE i.species_id = p_species_id
    GROUP BY i.status
    ORDER BY i.status;
$$;
