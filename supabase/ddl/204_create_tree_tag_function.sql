-- 204_create_tree_tag_function.sql

-- Create sequence for running tag codes
CREATE SEQUENCE IF NOT EXISTS public.tree_tag_code_seq;

-- Function to generate readable tag code
CREATE OR REPLACE FUNCTION public.generate_tree_tag_code()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'TAG-' || to_char(nextval('public.tree_tag_code_seq'), 'FM00000000');
$$;

-- Main function to create a single tree tag
CREATE OR REPLACE FUNCTION public.create_tree_tag(
  p_zone_id             uuid,
  p_species_id          uuid,
  p_size_label          text,
  p_qty                 integer,
  p_planting_row        integer,
  p_planting_position   integer,
  p_status              text DEFAULT 'in_zone',
  p_notes               text DEFAULT NULL
)
RETURNS public.tree_tags
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_tag public.tree_tags;
BEGIN
  INSERT INTO public.tree_tags (
    tag_code,
    zone_id,
    species_id,
    size_label,
    qty,
    planting_row,
    planting_position,
    status,
    notes
  )
  VALUES (
    public.generate_tree_tag_code(),
    p_zone_id,
    p_species_id,
    p_size_label,
    COALESCE(p_qty, 1),
    p_planting_row,
    p_planting_position,
    COALESCE(p_status, 'in_zone'),
    p_notes
  )
  RETURNING * INTO v_new_tag;

  RETURN v_new_tag;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tree_tag(
  uuid, uuid, text, integer, integer, integer, text, text
) TO authenticated;
