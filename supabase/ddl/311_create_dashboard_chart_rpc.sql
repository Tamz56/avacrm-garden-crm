-- 311_create_dashboard_chart_rpc.sql
-- กราฟ Revenue / Trees Out ตามช่วงเวลา

CREATE OR REPLACE FUNCTION public.get_dashboard_chart(
    p_mode text,                     -- 'revenue' | 'trees_out'
    p_date_from date,
    p_date_to   date,
    p_grouping text DEFAULT 'month'  -- 'day' | 'month'
)
RETURNS TABLE (
    bucket_date date,
    value       numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_mode = 'revenue' THEN
        RETURN QUERY
        SELECT
            CASE
                WHEN p_grouping = 'day'
                    THEN dp.payment_date
                ELSE date_trunc('month', dp.payment_date)::date
            END AS bucket_date,
            COALESCE(SUM(dp.amount), 0) AS value
        FROM public.deal_payments dp
        WHERE dp.status = 'verified'
          AND dp.payment_date BETWEEN p_date_from AND p_date_to
        GROUP BY 1
        ORDER BY 1;
        
    ELSIF p_mode = 'trees_out' THEN
        RETURN QUERY
        SELECT
            CASE
                WHEN p_grouping = 'day'
                    THEN ds.ship_date
                ELSE date_trunc('month', ds.ship_date)::date
            END AS bucket_date,
            COALESCE(SUM(sm.quantity), 0) AS value
        FROM public.deal_shipments ds
        JOIN public.stock_movements sm ON sm.shipment_id = ds.id
        WHERE ds.status IN ('completed', 'draft') -- Include draft as they might be scheduled? Or only completed? User said 'shipped','delivered'. Let's use completed.
          -- Actually, for "Trees Out" (historical), we usually count what actually left.
          -- But if we want to show future/current month, maybe draft too?
          -- Let's stick to 'completed' for historical accuracy, or maybe all non-cancelled?
          -- User's prompt: "status IN ('shipped', 'delivered')" which implies completed.
          -- My enum: 'draft', 'completed', 'cancelled'.
          -- I will use 'completed' for now.
          AND ds.status = 'completed'
          AND sm.movement_type = 'out'
          AND ds.ship_date BETWEEN p_date_from AND p_date_to
        GROUP BY 1
        ORDER BY 1;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_chart(text, date, date, text)
TO authenticated;

NOTIFY pgrst, 'reload schema';
