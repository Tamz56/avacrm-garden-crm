-- 129_setup_payout_system.sql
-- ติดตั้งระบบจ่ายเงิน: ตาราง, Trigger, RPC บันทึกจ่าย, และอัปเกรด V4 ให้ดึงยอดจ่ายจริง

-- ============================================================
-- 1. สร้างตาราง commission_payouts (ถ้ายังไม่มี)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.commission_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_commission_id UUID NOT NULL REFERENCES public.deal_commissions(id) ON DELETE CASCADE,
    pay_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL DEFAULT 'transfer',
    note TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Trigger เพื่ออัปเดตสถานะใน deal_commissions อัตโนมัติ
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_deal_commission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_commission_id UUID;
    v_total_paid NUMERIC(12, 2);
    v_commission_amount NUMERIC(12, 2);
BEGIN
    v_commission_id := COALESCE(NEW.deal_commission_id, OLD.deal_commission_id);

    -- หาผลรวมที่จ่ายไปแล้ว
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.commission_payouts
    WHERE deal_commission_id = v_commission_id;

    -- หายอดคอมฯ ทั้งหมด
    SELECT commission_amount INTO v_commission_amount
    FROM public.deal_commissions
    WHERE id = v_commission_id;

    -- อัปเดตกลับไปที่ deal_commissions
    UPDATE public.deal_commissions
    SET
        paid_amount = v_total_paid,
        status = CASE
            WHEN v_total_paid >= v_commission_amount THEN 'PAID'
            WHEN v_total_paid > 0 THEN 'PARTIAL'
            ELSE 'PENDING'
        END
    WHERE id = v_commission_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_deal_commission_status ON public.commission_payouts;
CREATE TRIGGER trg_update_deal_commission_status
AFTER INSERT OR UPDATE OR DELETE ON public.commission_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_deal_commission_status();

-- ============================================================
-- 3. RPC สำหรับบันทึกการจ่าย (Frontend เรียกตัวนี้)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_commission_payout(
    p_commission_id UUID,
    p_amount NUMERIC,
    p_date DATE,
    p_method TEXT,
    p_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payout_id UUID;
BEGIN
    INSERT INTO public.commission_payouts (deal_commission_id, amount, pay_date, method, note)
    VALUES (p_commission_id, p_amount, p_date, p_method, p_note)
    RETURNING id INTO v_payout_id;

    RETURN jsonb_build_object('success', true, 'payout_id', v_payout_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_commission_payout(UUID, NUMERIC, DATE, TEXT, TEXT) 
TO anon, authenticated, service_role;

-- ============================================================
-- 4. อัปเกรด get_commission_v4 ให้ดึงยอดจ่ายจริง
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_commission_v4(
    pid        UUID DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date   DATE DEFAULT NULL
)
RETURNS TABLE (
    deal_commission_id UUID,
    deal_id            UUID,
    deal_title         TEXT,
    role               TEXT,
    deal_amount        NUMERIC(12,2),
    commission_amount  NUMERIC(12,2),
    paid_in_month      NUMERIC(12,2),
    total_paid         NUMERIC(12,2),
    remaining_amount   NUMERIC(12,2),
    last_pay_date      DATE,
    status             TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    WITH monthly_payouts AS (
        SELECT
            deal_commission_id,
            SUM(amount) as amount_in_period,
            MAX(pay_date) as last_pay_date_in_period
        FROM public.commission_payouts
        WHERE
            (start_date IS NULL OR pay_date >= start_date)
            AND (end_date IS NULL OR pay_date <= end_date)
        GROUP BY deal_commission_id
    )
    SELECT
        dc.id                      AS deal_commission_id,
        dc.deal_id                 AS deal_id,
        d.title                    AS deal_title,
        COALESCE(dc.role, 'N/A')   AS role,
        COALESCE(dc.base_amount, 0)       AS deal_amount,
        COALESCE(dc.commission_amount, 0) AS commission_amount,

        -- ยอดจ่ายในเดือนนี้ (จาก CTE)
        COALESCE(mp.amount_in_period, 0)  AS paid_in_month,

        -- ยอดจ่ายรวมทั้งหมด (จากตาราง dc ที่ trigger อัปเดตให้)
        COALESCE(dc.paid_amount, 0)       AS total_paid,

        -- คงเหลือ
        (COALESCE(dc.commission_amount, 0) - COALESCE(dc.paid_amount, 0)) AS remaining_amount,

        -- วันที่จ่ายล่าสุด
        mp.last_pay_date_in_period        AS last_pay_date,

        COALESCE(dc.status, 'PENDING')    AS status
    FROM public.deal_commissions dc
    JOIN public.deals d ON d.id = dc.deal_id
    LEFT JOIN monthly_payouts mp ON mp.deal_commission_id = dc.id
    WHERE
        (pid IS NULL OR dc.profile_id = pid)
        -- โชว์รายการที่มีการจ่ายในเดือนนี้ หรือ ดีลที่เกิดขึ้นในเดือนนี้
        AND (
            (mp.amount_in_period > 0) -- มีการจ่ายในเดือนนี้
            OR
            (
                (start_date IS NULL OR d.created_at >= start_date::timestamp)
                AND (end_date IS NULL OR d.created_at < (end_date + INTERVAL '1 day')::timestamp)
            )
        )
    ORDER BY d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_v4(UUID, DATE, DATE) 
TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
