-- RPC to record a payment and return updated summary
CREATE OR REPLACE FUNCTION public.record_deal_payment(
    p_deal_id      UUID,
    p_amount       NUMERIC,
    p_payment_type TEXT DEFAULT 'payment', -- 'deposit' or 'payment'
    p_method       TEXT DEFAULT NULL,
    p_payment_date TIMESTAMPTZ DEFAULT NOW(),
    p_note         TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_amount       NUMERIC,
    paid_amount        NUMERIC,
    outstanding_amount NUMERIC,
    deposit_required   NUMERIC,
    deposit_paid       NUMERIC,
    deposit_status     TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1) insert payment
    INSERT INTO public.deal_payments (deal_id, amount, payment_type, method, payment_date, note)
    VALUES (p_deal_id, p_amount, p_payment_type, p_method, p_payment_date, p_note);

    -- 2) Return updated summary
    RETURN QUERY
    SELECT
        d.total_amount,
        COALESCE(SUM(dp.amount), 0)              AS paid_amount,
        d.total_amount - COALESCE(SUM(dp.amount), 0) AS outstanding_amount,
        d.deposit_required,
        COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) AS deposit_paid,
        CASE
            WHEN d.deposit_required IS NULL OR d.deposit_required = 0 THEN 'not_required'
            WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) >= d.deposit_required
                THEN 'completed'
            WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) > 0
                THEN 'partial'
            ELSE 'pending'
        END AS deposit_status
    FROM public.deals d
    LEFT JOIN public.deal_payments dp ON dp.deal_id = d.id
    WHERE d.id = p_deal_id
    GROUP BY d.id;
END;
$$;
