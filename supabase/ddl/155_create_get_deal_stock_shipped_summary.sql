-- 155_create_get_deal_stock_shipped_summary.sql

CREATE OR REPLACE FUNCTION public.get_deal_stock_shipped_summary(
    p_deal_id uuid
)
RETURNS TABLE (
    stock_item_id   uuid,
    total_shipped   numeric
)
LANGUAGE sql
AS $$
    SELECT
        m.stock_item_id,
        SUM(m.quantity) AS total_shipped
    FROM public.stock_movements m
    WHERE m.deal_id = p_deal_id
      AND m.direction = 'OUT'
    GROUP BY m.stock_item_id
$$;

GRANT EXECUTE ON FUNCTION public.get_deal_stock_shipped_summary(uuid)
TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
