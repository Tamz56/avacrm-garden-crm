-- 208_create_tree_tags_print_function.sql

CREATE OR REPLACE FUNCTION public.get_tree_tags_for_print(
    p_tag_ids uuid[]
)
RETURNS TABLE (
    id uuid,
    tag_code text,
    species_name_th text,
    species_name_en text,
    size_label text,
    qty integer,
    zone_name text,
    planting_row integer,
    planting_position integer,
    notes text
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        t.id,
        t.tag_code,
        s.name_th       AS species_name_th,
        s.name_en       AS species_name_en,
        t.size_label,
        t.qty,
        z.name          AS zone_name,
        t.planting_row,
        t.planting_position,
        t.notes
    FROM public.tree_tags t
    JOIN public.stock_species s
      ON t.species_id = s.id
    JOIN public.stock_zones z
      ON t.zone_id = z.id
    WHERE t.id = ANY (p_tag_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_tree_tags_for_print(uuid[])
TO authenticated;
