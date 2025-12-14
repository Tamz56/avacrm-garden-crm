-- ==========================================================
-- fix_record_deal_payment.sql
-- 1. RPC: record_deal_payment (Updated)
-- 2. RPC: update_deal_payment (New)
-- 3. RPC: delete_deal_payment (New)
-- 4. VIEW: view_deal_payment_summary (New/Updated)
-- ==========================================================

-- 1. ENUM UPDATE (Critical Fix for Error 22P02)
-- Ensure 'final' is in the enum
DO $$
BEGIN
    ALTER TYPE public.deal_payment_type ADD VALUE 'final';
EXCEPTION
    WHEN duplicate_object THEN null; -- already exists
    WHEN undefined_object THEN null; -- type doesn't exist (maybe column is text)
END $$;

-- 2. RECORD PAYMENT
-- Drop first because return type changed
DROP FUNCTION IF EXISTS public.record_deal_payment(UUID, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION public.record_deal_payment(
    p_deal_id      UUID,
    p_amount       NUMERIC,
    p_payment_type TEXT DEFAULT 'final', -- 'deposit' or 'final'
    p_method       TEXT DEFAULT NULL,
    p_payment_date TIMESTAMPTZ DEFAULT NOW(),
    p_note         TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_amount          NUMERIC,
    paid_amount           NUMERIC,
    outstanding_amount    NUMERIC,
    deposit_required_amount NUMERIC,
    deposit_paid          NUMERIC,
    deposit_status        TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.deal_payments (deal_id, amount, payment_type, method, payment_date, note)
    VALUES (p_deal_id, p_amount, p_payment_type, p_method, p_payment_date, p_note);

    RETURN QUERY
    SELECT
        d.total_amount,
        COALESCE(SUM(dp.amount), 0)                  AS paid_amount,
        d.total_amount - COALESCE(SUM(dp.amount), 0) AS outstanding_amount,
        d.deposit_amount                             AS deposit_required_amount,
        COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) AS deposit_paid,
        CASE
            WHEN d.deposit_amount IS NULL OR d.deposit_amount = 0 THEN 'not_required'
            WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) >= d.deposit_amount
                THEN 'completed'
            WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) > 0
                THEN 'partial'
            ELSE 'pending'
        END AS deposit_status
    FROM public.deals d
    LEFT JOIN public.deal_payments dp ON dp.deal_id = d.id
    WHERE d.id = p_deal_id
    GROUP BY d.id, d.total_amount, d.deposit_amount;
END;
$$;

-- 2. UPDATE PAYMENT
DROP FUNCTION IF EXISTS public.update_deal_payment(UUID, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION public.update_deal_payment(
    p_payment_id   UUID,
    p_amount       NUMERIC,
    p_payment_type TEXT,
    p_method       TEXT DEFAULT NULL,
    p_payment_date TIMESTAMPTZ DEFAULT NOW(),
    p_note         TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_amount          NUMERIC,
    paid_amount           NUMERIC,
    outstanding_amount    NUMERIC,
    deposit_required_amount NUMERIC,
    deposit_paid          NUMERIC,
    deposit_status        TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deal_id UUID;
BEGIN
    UPDATE public.deal_payments
    SET amount = p_amount,
        payment_type = p_payment_type,
        method = p_method,
        payment_date = p_payment_date,
        note = p_note,
        status = 'verified' -- Always auto-verify for manual entry
    WHERE id = p_payment_id
    RETURNING deal_id INTO v_deal_id;

    IF v_deal_id IS NULL THEN
        RAISE EXCEPTION 'Payment ID % not found', p_payment_id;
    END IF;

    RETURN QUERY
    SELECT
        d.total_amount,
        COALESCE(SUM(dp.amount), 0)                  AS paid_amount,
        d.total_amount - COALESCE(SUM(dp.amount), 0) AS outstanding_amount,
        d.deposit_amount                             AS deposit_required_amount,
        COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) AS deposit_paid,
        CASE
            WHEN d.deposit_amount IS NULL OR d.deposit_amount = 0 THEN 'not_required'
            WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) >= d.deposit_amount
                THEN 'completed'
            WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) > 0
                THEN 'partial'
            ELSE 'pending'
        END AS deposit_status
    FROM public.deals d
    LEFT JOIN public.deal_payments dp ON dp.deal_id = d.id
    WHERE d.id = v_deal_id
    GROUP BY d.id, d.total_amount, d.deposit_amount;
END;
$$;

-- 3. DELETE PAYMENT
DROP FUNCTION IF EXISTS public.delete_deal_payment(UUID);

CREATE OR REPLACE FUNCTION public.delete_deal_payment(
    p_payment_id UUID
)
RETURNS TABLE (
    total_amount          NUMERIC,
    paid_amount           NUMERIC,
    outstanding_amount    NUMERIC,
    deposit_required_amount NUMERIC,
    deposit_paid          NUMERIC,
    deposit_status        TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deal_id UUID;
BEGIN
    DELETE FROM public.deal_payments
    WHERE id = p_payment_id
    RETURNING deal_id INTO v_deal_id;

    IF v_deal_id IS NULL THEN
        RAISE EXCEPTION 'Payment ID % not found', p_payment_id;
    END IF;

    RETURN QUERY
    SELECT
        d.total_amount,
        COALESCE(SUM(dp.amount), 0)                  AS paid_amount,
        d.total_amount - COALESCE(SUM(dp.amount), 0) AS outstanding_amount,
        d.deposit_amount                             AS deposit_required_amount,
        COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) AS deposit_paid,
        CASE
            WHEN d.deposit_amount IS NULL OR d.deposit_amount = 0 THEN 'not_required'
            WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) >= d.deposit_amount
                THEN 'completed'
            WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) > 0
                THEN 'partial'
            ELSE 'pending'
        END AS deposit_status
    FROM public.deals d
    LEFT JOIN public.deal_payments dp ON dp.deal_id = d.id
    WHERE d.id = v_deal_id
    GROUP BY d.id, d.total_amount, d.deposit_amount;
END;
$$;

-- 4. VIEW for Hooks
DROP VIEW IF EXISTS public.view_deal_payment_summary;
CREATE OR REPLACE VIEW public.view_deal_payment_summary AS
SELECT
    d.id AS deal_id,
    d.total_amount AS deal_amount,
    d.deposit_amount AS deposit_required_amount,
    COALESCE(SUM(dp.amount), 0) AS total_paid,
    COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) AS deposit_paid,
    COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'final' OR dp.payment_type::text = 'payment' OR dp.payment_type IS NULL), 0) AS non_deposit_paid,
    CASE
        WHEN d.deposit_amount IS NULL OR d.deposit_amount = 0 THEN 'not_required'
        WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) >= d.deposit_amount THEN 'completed'
        WHEN COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_type = 'deposit'), 0) > 0 THEN 'partial'
        ELSE 'pending'
    END AS deposit_status,
    d.total_amount - COALESCE(SUM(dp.amount), 0) AS remaining_amount
FROM public.deals d
LEFT JOIN public.deal_payments dp ON dp.deal_id = d.id
GROUP BY d.id, d.total_amount, d.deposit_amount;

-- Grant permissions (optional but good practice)
GRANT SELECT ON public.view_deal_payment_summary TO authenticated;
GRANT SELECT ON public.view_deal_payment_summary TO service_role;
