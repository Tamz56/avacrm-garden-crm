-- 349_patch_create_tree_tag_qty_guard.sql
-- Fix guard to count TREES (SUM qty) not TAGS (COUNT rows)
-- Also update created_tag_qty properly based on actual tree count

-- First, update get_tagged_qty to use SUM(qty) if not already
CREATE OR REPLACE FUNCTION public.get_tagged_qty(
  p_zone_id     uuid,
  p_species_id  uuid,
  p_size_label  text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(qty), 0)::int
  FROM public.tree_tags
  WHERE zone_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label;
$$;

-- Patch create_tree_tag with SUM(qty) guard
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
  v_inventory planting_plot_inventory;
  v_existing_trees int;
  v_requested_trees int;
BEGIN
  v_requested_trees := COALESCE(p_qty, 1);

  -- 1) Lock inventory row FOR UPDATE
  SELECT * INTO v_inventory
  FROM public.planting_plot_inventory
  WHERE plot_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label
  FOR UPDATE;

  -- 2) Guard: inventory row must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบข้อมูล Inventory สำหรับ zone=%, species=%, size=% - กรุณาเพิ่ม Inventory ก่อนสร้าง Tag',
      p_zone_id, p_species_id, p_size_label;
  END IF;

  -- 3) Count existing TREES (SUM qty) not tags
  SELECT COALESCE(SUM(qty), 0)::int INTO v_existing_trees
  FROM public.tree_tags
  WHERE zone_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label;

  -- 4) Guard: planted_qty >= existing_trees + requested_trees
  IF v_inventory.planted_qty < (v_existing_trees + v_requested_trees) THEN
    RAISE EXCEPTION 'จำนวนต้นไม้รวม (% + % = %) เกินจำนวนที่ปลูกใน Inventory (%) - กรุณาเพิ่ม Inventory ก่อน',
      v_existing_trees, v_requested_trees, (v_existing_trees + v_requested_trees), v_inventory.planted_qty;
  END IF;

  -- 5) Insert new tag
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
    v_requested_trees,
    p_planting_row,
    p_planting_position,
    COALESCE(p_status, 'in_zone'),
    p_notes
  )
  RETURNING * INTO v_new_tag;

  -- 6) Update created_tag_qty by TREE count (not tag count)
  UPDATE public.planting_plot_inventory
  SET created_tag_qty = created_tag_qty + v_requested_trees,
      updated_at = now()
  WHERE id = v_inventory.id;

  RETURN v_new_tag;
END;
$$;

-- Patch create_tree_tags_batch with SUM(qty) guard
CREATE OR REPLACE FUNCTION public.create_tree_tags_batch(
  p_zone_id           uuid,
  p_species_id        uuid,
  p_size_label        text,
  p_qty               integer,
  p_planting_row      integer DEFAULT NULL,
  p_planting_position integer DEFAULT NULL,
  p_status            text    DEFAULT 'in_zone',
  p_notes             text    DEFAULT NULL,
  p_tags_count        integer DEFAULT 10
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventory planting_plot_inventory;
  v_existing_trees int;
  v_per_tag_qty int;
  v_tags_to_create int;
  v_total_trees_requested int;
  v_created_tags int := 0;
  i int;
BEGIN
  v_per_tag_qty := COALESCE(p_qty, 1);
  v_tags_to_create := COALESCE(p_tags_count, 10);
  v_total_trees_requested := v_per_tag_qty * v_tags_to_create;

  -- 1) Lock inventory row FOR UPDATE
  SELECT * INTO v_inventory
  FROM public.planting_plot_inventory
  WHERE plot_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label
  FOR UPDATE;

  -- 2) Guard: inventory row must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบข้อมูล Inventory สำหรับ zone=%, species=%, size=% - กรุณาเพิ่ม Inventory ก่อนสร้าง Tag',
      p_zone_id, p_species_id, p_size_label;
  END IF;

  -- 3) Count existing TREES (SUM qty)
  SELECT COALESCE(SUM(qty), 0)::int INTO v_existing_trees
  FROM public.tree_tags
  WHERE zone_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label;

  -- 4) Guard: planted_qty >= existing_trees + total_trees_requested
  IF v_inventory.planted_qty < (v_existing_trees + v_total_trees_requested) THEN
    RAISE EXCEPTION 'จำนวนต้นไม้รวม (% + % = %) เกินจำนวนที่ปลูกใน Inventory (%) - กรุณาเพิ่ม Inventory ก่อน',
      v_existing_trees, v_total_trees_requested, (v_existing_trees + v_total_trees_requested), v_inventory.planted_qty;
  END IF;

  -- 5) Insert tags in batch
  FOR i IN 1..v_tags_to_create LOOP
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
      v_per_tag_qty,
      p_planting_row,
      p_planting_position,
      COALESCE(p_status, 'in_zone'),
      p_notes
    );
    v_created_tags := v_created_tags + 1;
  END LOOP;

  -- 6) Update created_tag_qty by total TREES created (not tag count)
  UPDATE public.planting_plot_inventory
  SET created_tag_qty = created_tag_qty + v_total_trees_requested,
      updated_at = now()
  WHERE id = v_inventory.id;

  RETURN v_created_tags;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_tagged_qty(uuid, uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_tree_tag(
  uuid, uuid, text, integer, integer, integer, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_tree_tags_batch(
  uuid, uuid, text, integer, integer, integer, text, text, integer
) TO authenticated;
