-- 154_create_apply_shipment_stock_movement.sql

-- 1. Ensure stock_movements has shipment_id column
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS shipment_id UUID;

-- 2. Create RPC: apply_shipment_stock_movement
CREATE OR REPLACE FUNCTION public.apply_shipment_stock_movement(
    p_deal_id      uuid,
    p_shipment_id  uuid,
    p_items        jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item jsonb;
BEGIN
    -- p_items format:
    -- [ { "stock_item_id": "...", "zone_id": "...", "quantity": 10, "note": "..." }, ... ]

    IF jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'p_items must be a JSON array';
    END IF;

    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.stock_movements (
            stock_item_id,
            deal_id,
            shipment_id,
            zone_id,
            quantity,
            movement_type,
            direction,
            note,
            created_by
        )
        VALUES (
            (v_item->>'stock_item_id')::uuid,
            p_deal_id,
            p_shipment_id,
            (v_item->>'zone_id')::uuid,
            (v_item->>'quantity')::numeric,
            'out',
            'OUT',
            COALESCE(v_item->>'note', 'Shipment stock movement'),
            auth.uid()
        );
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_shipment_stock_movement(uuid, uuid, jsonb)
TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
