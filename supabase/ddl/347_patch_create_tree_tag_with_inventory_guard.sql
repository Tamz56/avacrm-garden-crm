-- 347_patch_create_tree_tag_with_inventory_guard.sql
-- Add strict inventory guard + created_tag_qty update to create_tree_tag

-- 1) Create unique index on planting_plot_inventory (plot_id, species_id, size_label)
CREATE UNIQUE INDEX IF NOT EXISTS idx_plot_inventory_unique
ON public.planting_plot_inventory (plot_id, species_id, size_label);

-- 2) Replace create_tree_tag function with inventory guard
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
  v_existing_tags int;
  v_requested_qty int;
BEGIN
  v_requested_qty := COALESCE(p_qty, 1);

  -- 1) Lock inventory row FOR UPDATE
  SELECT * INTO v_inventory
  FROM public.planting_plot_inventory
  WHERE plot_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label
  FOR UPDATE;

  -- 2) Guard: inventory row must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบข้อมูล Inventory สำหรับ zone_id=%, species_id=%, size_label=% - กรุณาเพิ่ม Inventory ก่อนสร้าง Tag',
      p_zone_id, p_species_id, p_size_label;
  END IF;

  -- 3) Count existing tags for this (zone_id, species_id, size_label)
  SELECT COUNT(*)::int INTO v_existing_tags
  FROM public.tree_tags
  WHERE zone_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label;

  -- 4) Guard: planted_qty >= existing_tags + requested_qty
  IF v_inventory.planted_qty < (v_existing_tags + v_requested_qty) THEN
    RAISE EXCEPTION 'จำนวน Tag รวม (% + % = %) เกินจำนวนที่ปลูกใน Inventory (%) - กรุณาเพิ่ม Inventory ก่อน',
      v_existing_tags, v_requested_qty, (v_existing_tags + v_requested_qty), v_inventory.planted_qty;
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
    v_requested_qty,
    p_planting_row,
    p_planting_position,
    COALESCE(p_status, 'in_zone'),
    p_notes
  )
  RETURNING * INTO v_new_tag;

  -- 6) Update created_tag_qty in inventory
  UPDATE public.planting_plot_inventory
  SET created_tag_qty = created_tag_qty + v_requested_qty,
      updated_at = now()
  WHERE id = v_inventory.id;

  RETURN v_new_tag;
END;
$$;

-- 3) Also patch the batch function with the same guard
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
  v_existing_tags int;
  v_total_requested int;
  v_created int := 0;
  i int;
BEGIN
  v_total_requested := COALESCE(p_tags_count, 10);

  -- 1) Lock inventory row FOR UPDATE
  SELECT * INTO v_inventory
  FROM public.planting_plot_inventory
  WHERE plot_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label
  FOR UPDATE;

  -- 2) Guard: inventory row must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบข้อมูล Inventory สำหรับ zone_id=%, species_id=%, size_label=% - กรุณาเพิ่ม Inventory ก่อนสร้าง Tag',
      p_zone_id, p_species_id, p_size_label;
  END IF;

  -- 3) Count existing tags
  SELECT COUNT(*)::int INTO v_existing_tags
  FROM public.tree_tags
  WHERE zone_id = p_zone_id
    AND species_id = p_species_id
    AND size_label = p_size_label;

  -- 4) Guard: planted_qty >= existing_tags + total_requested
  IF v_inventory.planted_qty < (v_existing_tags + v_total_requested) THEN
    RAISE EXCEPTION 'จำนวน Tag รวม (% + % = %) เกินจำนวนที่ปลูกใน Inventory (%) - กรุณาเพิ่ม Inventory ก่อน',
      v_existing_tags, v_total_requested, (v_existing_tags + v_total_requested), v_inventory.planted_qty;
  END IF;

  -- 5) Insert tags in batch
  FOR i IN 1..v_total_requested LOOP
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
    );
    v_created := v_created + 1;
  END LOOP;

  -- 6) Update created_tag_qty in inventory
  UPDATE public.planting_plot_inventory
  SET created_tag_qty = created_tag_qty + v_created,
      updated_at = now()
  WHERE id = v_inventory.id;

  RETURN v_created;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.create_tree_tag(
  uuid, uuid, text, integer, integer, integer, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_tree_tags_batch(
  uuid, uuid, text, integer, integer, integer, text, text, integer
) TO authenticated;
