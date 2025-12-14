-- ==========================================================
-- COMPLETE_FIX.sql
-- รวมทุกการแก้ไข (Ultimate Version): 
-- 1. แก้บัค Commission Status (Case-Insensitive Constraint) - รองรับ Pending, PENDING, pending
-- 2. แก้บัค Payment Enum (22P02)
-- 3. อัปเดต Function การชำระเงิน (Return Type mismatch 42P13)
-- ==========================================================

-- ==========================================================
-- PART 0: ล้างและสร้าง Constraint ใหม่ (Case-Insensitive Check)
-- ==========================================================
DO $$
BEGIN
    -- 1. ลบ Constraint เจ้าปัญหาออกก่อน
    ALTER TABLE public.deal_commissions 
    DROP CONSTRAINT IF EXISTS deal_commissions_status_check;

    -- 2. เพิ่ม Constraint แบบไม่สนใจตัวพิมพ์เล็ก-ใหญ่
    ALTER TABLE public.deal_commissions
    ADD CONSTRAINT deal_commissions_status_check 
    CHECK (UPPER(status) IN (
        'PENDING', 
        'PARTIAL', 
        'PAID', 
        'CANCELLED'
    ));
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error manipulating constraint: %', SQLERRM;
END $$;


-- ==========================================================
-- PART 1: อัปเดต Function Calc Commission
-- ==========================================================
DROP FUNCTION IF EXISTS public.recalc_deal_commissions(UUID);

CREATE OR REPLACE FUNCTION public.recalc_deal_commissions(p_deal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deal RECORD;
    v_config RECORD;
    v_rate NUMERIC;
BEGIN
    SELECT id, total_amount, closing_sales_id, referral_sales_id, team_leader_id
    INTO v_deal FROM public.deals WHERE id = p_deal_id;

    IF v_deal.id IS NULL THEN RAISE EXCEPTION 'Deal % not found', p_deal_id; END IF;

    SELECT * INTO v_config FROM public.v_commission_config_single;
    IF v_config IS NULL THEN RAISE EXCEPTION 'No active commission configuration found'; END IF;

    -- Sales Agent
    IF v_deal.closing_sales_id IS NOT NULL THEN
        INSERT INTO public.deal_commissions (deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id)
        VALUES (p_deal_id, 'sales_agent', v_deal.closing_sales_id, v_config.sales_rate, COALESCE(v_deal.total_amount, 0), COALESCE(v_deal.total_amount, 0) * v_config.sales_rate, 'PENDING', v_config.id)
        ON CONFLICT (deal_id, role) DO UPDATE SET
            commission_amount = EXCLUDED.commission_amount, status = EXCLUDED.status;
    END IF;

    -- Referral
    IF v_deal.referral_sales_id IS NOT NULL THEN
        INSERT INTO public.deal_commissions (deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id)
        VALUES (p_deal_id, 'referral', v_deal.referral_sales_id, v_config.referral_rate, COALESCE(v_deal.total_amount, 0), COALESCE(v_deal.total_amount, 0) * v_config.referral_rate, 'PENDING', v_config.id)
        ON CONFLICT (deal_id, role) DO UPDATE SET
            commission_amount = EXCLUDED.commission_amount, status = EXCLUDED.status;
    END IF;

    -- Team Leader
    IF v_deal.team_leader_id IS NOT NULL THEN
        INSERT INTO public.deal_commissions (deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id)
        VALUES (p_deal_id, 'team_leader', v_deal.team_leader_id, v_config.team_rate, COALESCE(v_deal.total_amount, 0), COALESCE(v_deal.total_amount, 0) * v_config.team_rate, 'PENDING', v_config.id)
        ON CONFLICT (deal_id, role) DO UPDATE SET
            commission_amount = EXCLUDED.commission_amount, status = EXCLUDED.status;
    END IF;

    RETURN TRUE;
END;
$$;


-- ==========================================================
-- PART 2: แก้ไขระบบชำระเงิน (Payment System)
-- ==========================================================

-- 2.1 Ensure 'final' is in the enum safely
DO $$
BEGIN
    ALTER TYPE public.deal_payment_type ADD VALUE 'final';
EXCEPTION
    WHEN duplicate_object THEN null; 
    WHEN undefined_object THEN null; 
END $$;

-- 2.2 RECORD PAYMENT
DROP FUNCTION IF EXISTS public.record_deal_payment(UUID, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION public.record_deal_payment(
    p_deal_id      UUID,
    p_amount       NUMERIC,
    p_payment_type TEXT DEFAULT 'final', 
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

-- 2.3 UPDATE PAYMENT
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
        status = 'verified'
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

-- 2.4 DELETE PAYMENT
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

-- 2.5 VIEW for Hooks
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

GRANT SELECT ON public.view_deal_payment_summary TO authenticated;
GRANT SELECT ON public.view_deal_payment_summary TO service_role;
