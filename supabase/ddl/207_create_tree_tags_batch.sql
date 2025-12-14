-- 207_create_tree_tags_batch.sql

CREATE OR REPLACE FUNCTION public.create_tree_tags_batch(
    p_zone_id             uuid,
    p_species_id          uuid,
    p_size_label          text,
    p_qty                 integer,      -- trees per tag
    p_planting_row        integer,
    p_planting_position   integer,
    p_notes               text,
    p_tags_count          integer       -- number of tags to generate
)
RETURNS SETOF public.tree_tags
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    i integer;
    v_new_tag public.tree_tags;
BEGIN
    IF p_tags_count IS NULL OR p_tags_count <= 0 THEN
        RAISE EXCEPTION 'tags_count must be > 0';
    END IF;

    FOR i IN 1..p_tags_count LOOP
        -- Call the existing single tag creation function
        SELECT * INTO v_new_tag
        FROM public.create_tree_tag(
            p_zone_id,
            p_species_id,
            p_size_label,
            p_qty,
            p_planting_row,
            -- Auto-increment position if provided
            CASE 
                WHEN p_planting_position IS NOT NULL THEN p_planting_position + (i - 1) 
                ELSE NULL 
            END,
            'in_zone', -- Default status
            p_notes
        );

        RETURN NEXT v_new_tag;
    END LOOP;

    RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tree_tags_batch(
    uuid, uuid, text, integer, integer, integer, text, integer
) TO authenticated;
