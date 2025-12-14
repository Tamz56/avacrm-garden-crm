-- 320_deduct_stock_for_deal.sql

CREATE OR REPLACE FUNCTION public.deduct_stock_for_deal(p_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r_item RECORD;
BEGIN
  -- Loop through deal items that are linked to stock items
  FOR r_item IN
    SELECT di.stock_item_id, di.quantity, si.zone_id
    FROM deal_items di
    JOIN stock_items si ON di.stock_item_id = si.id
    WHERE di.deal_id = p_deal_id
    AND di.stock_item_id IS NOT NULL
  LOOP
    -- 1. Insert movement log (OUT)
    INSERT INTO stock_movements (
        stock_item_id, 
        deal_id, 
        movement_type, 
        direction, 
        quantity, 
        zone_id, 
        created_by,
        note
    )
    VALUES (
        r_item.stock_item_id, 
        p_deal_id, 
        'out', 
        'OUT', 
        r_item.quantity, 
        r_item.zone_id, 
        auth.uid(),
        'Deduct stock for deal ' || p_deal_id
    );

    -- 2. Update stock quantity
    -- Note: This assumes we are deducting from 'quantity_available'. 
    -- If your logic requires deducting from 'quantity_reserved' (e.g. if items were already reserved),
    -- you should adjust this logic or check the deal stage.
    -- For now, we deduct from available to keep it simple as per request.
    UPDATE stock_items
    SET quantity_available = GREATEST(0, quantity_available - r_item.quantity)
    WHERE id = r_item.stock_item_id;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.deduct_stock_for_deal(uuid) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
