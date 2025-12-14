-- 251_lifecycle_functions.sql

-- Function to recalculate status for a SINGLE tag
CREATE OR REPLACE FUNCTION public.recalc_tree_tag_status(p_tag_id uuid)
RETURNS void AS $$
DECLARE
  v_status text := 'in_zone'; -- Default to 'available' (using 'in_zone' as per enum)
BEGIN
  -- 1) Planted (TODO: Check planting records table when available)
  -- For now, we skip this check as there is no planting table.
  -- IF EXISTS (SELECT 1 FROM public.customer_plantings WHERE tree_tag_id = p_tag_id) THEN
  --     v_status := 'planted';
  
  -- 2) Shipped
  -- Check if tag is assigned to a shipment and that shipment is shipping or delivered
  IF EXISTS (
      SELECT 1
      FROM public.tree_tags t
      JOIN public.deal_shipments s ON s.id = t.shipment_id
      WHERE t.id = p_tag_id
        AND s.status IN ('shipping', 'delivered', 'completed') -- Adjust based on actual enum usage
  ) THEN
      v_status := 'shipped';

  -- 3) Dug (or Dig Ordered)
  -- Check if tag is in a dig order
  ELSIF EXISTS (
      SELECT 1
      FROM public.dig_order_items di
      JOIN public.dig_orders d ON d.id = di.dig_order_id
      WHERE di.tag_id = p_tag_id
        AND d.status != 'cancelled'
  ) THEN
      -- Check specific status of the dig order
      DECLARE
          v_dig_status text;
      BEGIN
          SELECT d.status INTO v_dig_status
          FROM public.dig_order_items di
          JOIN public.dig_orders d ON d.id = di.dig_order_id
          WHERE di.tag_id = p_tag_id
          LIMIT 1;

          IF v_dig_status = 'completed' THEN
              v_status := 'dug';
          ELSE
              v_status := 'dig_ordered'; -- draft, scheduled
          END IF;
      END;

  -- 4) Reserved (in Deal)
  -- Check if tag is assigned to a deal that is not lost/cancelled
  ELSIF EXISTS (
      SELECT 1
      FROM public.tree_tags t
      JOIN public.deals d ON d.id = t.deal_id
      WHERE t.id = p_tag_id
        AND d.stage != 'lost'
        -- AND d.status != 'cancelled' -- If status has cancelled
  ) THEN
      v_status := 'reserved';

  ELSE
      v_status := 'in_zone'; -- Available
  END IF;

  -- Update the tag status
  UPDATE public.tree_tags
  SET status = v_status,
      updated_at = now()
  WHERE id = p_tag_id
    AND status IS DISTINCT FROM v_status; -- Only update if changed

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper for BATCH updates
CREATE OR REPLACE FUNCTION public.recalc_tree_tags_status(p_tag_ids uuid[])
RETURNS void AS $$
DECLARE
  v_tag_id uuid;
BEGIN
  FOREACH v_tag_id IN ARRAY p_tag_ids LOOP
    PERFORM public.recalc_tree_tag_status(v_tag_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.recalc_tree_tag_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_tree_tags_status(uuid[]) TO authenticated;
