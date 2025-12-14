-- 152_create_deal_stock_rpc.sql
-- Create RPC for Deal Stock Summary Card

CREATE OR REPLACE FUNCTION public.get_deal_stock_allocation(p_deal_id UUID)
RETURNS TABLE (
    deal_id UUID,
    deal_item_id UUID,
    stock_item_id UUID,
    ordered_quantity NUMERIC,
    shipped_quantity NUMERIC,
    remaining_quantity NUMERIC,
    -- Extra metadata for frontend convenience
    stock_item_code TEXT,
    stock_item_size TEXT,
    stock_item_zone TEXT,
    zone_id UUID
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        dss.deal_id,
        dss.deal_item_id,
        dss.stock_item_id,
        dss.deal_quantity AS ordered_quantity,
        dss.total_moved_for_deal AS shipped_quantity,
        dss.stock_quantity_available AS remaining_quantity,
        -- Fetch extra metadata if needed, assuming deal_stock_summary or joins have it
        -- deal_stock_summary has size_label and zone_name. It doesn't have code.
        -- We can join stock_items to get code if needed, or just use what we have.
        -- Let's join stock_items to be sure.
        si.code AS stock_item_code,
        dss.size_label AS stock_item_size,
        dss.zone_name AS stock_item_zone,
        si.zone_id
    FROM public.deal_stock_summary dss
    LEFT JOIN public.stock_items si ON si.id = dss.stock_item_id
    WHERE dss.deal_id = p_deal_id;
$$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
