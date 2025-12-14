-- 176_create_transfer_trees_rpc.sql

-- 1. Add columns to stock_items if not exists
ALTER TABLE public.stock_items
ADD COLUMN IF NOT EXISTS note text,
ADD COLUMN IF NOT EXISTS received_date date;

-- 2. Ensure Unique Index exists (for ON CONFLICT)
-- Note: The UNIQUE constraint on (species_id, zone_id, size_label, grade) already creates an index,
-- but creating an explicit one ensures it exists even if the constraint was modified.
CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_items_species_zone_size_grade
ON public.stock_items (species_id, zone_id, size_label, grade);

-- 3. Create transfer_trees_from_plot_to_stock function
DROP FUNCTION IF EXISTS public.transfer_trees_from_plot_to_stock(uuid, uuid, integer, date, text);

CREATE OR REPLACE FUNCTION public.transfer_trees_from_plot_to_stock(
  _plot_tree_id uuid,
  _target_zone_id uuid,
  _quantity integer,
  _transfer_date date,
  _note text
)
RETURNS void
LANGUAGE plpgsql
AS $func$
DECLARE
  v_plot   public.planting_plot_trees;
  v_remain integer;
BEGIN
  -- Validation
  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'quantity must be > 0';
  END IF;

  -- Lock and get plot tree
  SELECT *
  INTO v_plot
  FROM public.planting_plot_trees
  WHERE id = _plot_tree_id
  FOR UPDATE;

  IF v_plot.id IS NULL THEN
    RAISE EXCEPTION 'planting_plot_trees row not found (id=%)', _plot_tree_id;
  END IF;

  v_remain := v_plot.planted_count - v_plot.moved_to_stock_count;

  IF _quantity > v_remain THEN
    RAISE EXCEPTION 'quantity (%) is greater than remaining trees in plot (%)', _quantity, v_remain;
  END IF;

  -- UPSERT into stock_items
  -- Unique constraint: (species_id, zone_id, size_label, grade)
  INSERT INTO public.stock_items (
    species_id,
    zone_id,
    size_label,
    grade,
    quantity_available,
    quantity_reserved,
    base_price,
    status,
    note,
    source_type,
    source_plot_id,
    source_plot_tree_id,
    received_date,
    created_at,
    updated_at
  )
  VALUES (
    v_plot.species_id,
    _target_zone_id,
    v_plot.size_label,
    NULL, -- grade
    _quantity,
    0, -- reserved
    0, -- base_price (default)
    'available'::public.stock_status,
    _note,
    'from_plot',
    v_plot.plot_id,
    v_plot.id,
    COALESCE(_transfer_date, CURRENT_DATE),
    NOW(),
    NOW()
  )
  ON CONFLICT (species_id, zone_id, size_label, grade)
  DO UPDATE SET
    quantity_available = stock_items.quantity_available + EXCLUDED.quantity_available,
    note = CASE 
             WHEN stock_items.note IS NULL OR stock_items.note = '' THEN EXCLUDED.note
             WHEN EXCLUDED.note IS NULL OR EXCLUDED.note = '' THEN stock_items.note
             ELSE stock_items.note || E'\n' || EXCLUDED.note
           END,
    updated_at = NOW();

  -- Update planting_plot_trees
  UPDATE public.planting_plot_trees
  SET moved_to_stock_count = moved_to_stock_count + _quantity,
      updated_at = NOW()
  WHERE id = _plot_tree_id;

END;
$func$;

GRANT EXECUTE ON FUNCTION public.transfer_trees_from_plot_to_stock(uuid, uuid, integer, date, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
