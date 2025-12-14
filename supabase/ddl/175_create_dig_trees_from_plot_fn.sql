-- 175_create_dig_trees_from_plot_fn.sql

CREATE OR REPLACE FUNCTION public.dig_trees_from_plot(
  _plot_tree_id uuid,
  _dig_count integer,
  _zone_id uuid,
  _dig_date date
)
RETURNS void
LANGUAGE plpgsql
AS $func$
DECLARE
  v_plot   public.planting_plot_trees;
  v_remain integer;
BEGIN
  IF _dig_count IS NULL OR _dig_count <= 0 THEN
    RAISE EXCEPTION 'dig_count must be > 0';
  END IF;

  -- ดึงข้อมูล row แปลงปลูก
  SELECT *
  INTO v_plot
  FROM public.planting_plot_trees
  WHERE id = _plot_tree_id
  FOR UPDATE;  -- lock กัน race condition

  IF v_plot.id IS NULL THEN
    RAISE EXCEPTION 'planting_plot_trees row not found (id=%)', _plot_tree_id;
  END IF;

  v_remain := v_plot.planted_count - v_plot.moved_to_stock_count;

  IF _dig_count > v_remain THEN
    RAISE EXCEPTION 'dig_count (%) is greater than remaining trees in plot (%)', _dig_count, v_remain;
  END IF;

  -- 1) insert ต้นไม้เข้า stock_items
  INSERT INTO public.stock_items (
    species_id,
    size_label,
    zone_id,
    status,
    source_type,
    source_plot_id,
    source_plot_tree_id,
    planted_date,
    created_at,
    quantity_available -- Assuming stock items are individual, so qty=1. But if stock_items is aggregate?
    -- Wait, generate_series implies individual items.
    -- If stock_items has quantity_available, we should set it to 1 for each item?
    -- Or is stock_items purely aggregate?
    -- The user's previous code used quantity_available.
    -- If I insert individual rows, quantity_available should be 1.
  )
  SELECT
    v_plot.species_id,
    v_plot.size_label,
    _zone_id,
    'available'::stock_status,              -- ถ้า enum ใช้ชื่ออื่น ปรับตรงนี้
    'from_plot',                            -- text หรือ enum ตาม schema ที่มี
    v_plot.plot_id,
    v_plot.id,
    _dig_date,
    NOW(),
    1 -- Set quantity to 1 for individual items
  FROM generate_series(1, _dig_count) AS g;

  -- 2) update ตัวเลขล้อมออกแล้ว
  UPDATE public.planting_plot_trees
  SET moved_to_stock_count = moved_to_stock_count + _dig_count,
      updated_at           = NOW()
  WHERE id = _plot_tree_id;

END;
$func$;

GRANT EXECUTE ON FUNCTION public.dig_trees_from_plot(uuid, integer, uuid, date) TO authenticated;
NOTIFY pgrst, 'reload schema';
