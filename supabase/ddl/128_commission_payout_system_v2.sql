-- 128_commission_payout_system_v2.sql
-- ระบบจ่ายค่าคอมฯ แบบมีหลายงวด + ผูกกับรายงาน V4

-- =========================================================
-- 1. ตารางประวัติการจ่ายค่าคอมฯ: commission_payouts
-- =========================================================

CREATE TABLE IF NOT EXISTS public.commission_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_commission_id UUID NOT NULL
        REFERENCES public.deal_commissions(id) ON DELETE CASCADE,
    pay_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    method TEXT DEFAULT 'transfer',          -- โอน / เงินสด / อื่น ๆ
    note TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- index ไว้ให้ report เร็ว
CREATE INDEX IF NOT EXISTS idx_commission_payouts_deal_commission
    ON public.commission_payouts(deal_commission_id);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_pay_date
    ON public.commission_payouts(pay_date);

-- เติม updated_at ถ้ายังไม่มีใน deal_commissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'deal_commissions'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.deal_commissions
            ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- =========================================================
-- 2. ฟังก์ชันบันทึกการจ่ายค่าคอมฯ (partial payment ได้)
-- =========================================================

CREATE OR REPLACE FUNCTION public.record_commission_payout(
    p_deal_commission_id UUID,
    p_amount             NUMERIC(12,2),
    p_pay_date           DATE DEFAULT CURRENT_DATE,
    p_method             TEXT DEFAULT 'transfer',
    p_note               TEXT DEFAULT NULL,
    p_actor              UUID DEFAULT NULL
)
RETURNS TABLE (
    deal_commission_id UUID,
    commission_amount  NUMERIC(12,2),
    total_paid         NUMERIC(12,2),
    remaining_amount   NUMERIC(12,2),
    status             TEXT,
    last_pay_date      DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_commission_amount NUMERIC(12,2);
    v_current_paid      NUMERIC(12,2);
    v_new_total_paid    NUMERIC(12,2);
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;

    -- ดึงข้อมูลจาก deal_commissions
    SELECT dc.commission_amount, dc.paid_amount
    INTO v_commission_amount, v_current_paid
    FROM public.deal_commissions dc
    WHERE dc.id = p_deal_commission_id;

    IF v_commission_amount IS NULL THEN
        RAISE EXCEPTION 'deal_commission % not found', p_deal_commission_id;
    END IF;

    v_new_total_paid := COALESCE(v_current_paid, 0) + p_amount;

    -- กันจ่ายเกิน
    IF v_new_total_paid > v_commission_amount THEN
        RAISE EXCEPTION 'Payment %.2f is too high. Remaining = %.2f',
            p_amount, (v_commission_amount - COALESCE(v_current_paid,0));
    END IF;

    -- บันทึกประวัติการจ่าย
    INSERT INTO public.commission_payouts(
        deal_commission_id,
        pay_date,
        amount,
        method,
        note,
        created_by
    )
    VALUES (
        p_deal_commission_id,
        p_pay_date,
        p_amount,
        p_method,
        p_note,
        p_actor
    );

    -- อัปเดตยอดจ่ายรวม + สถานะใน deal_commissions
    UPDATE public.deal_commissions dc
    SET
        paid_amount = v_new_total_paid,
        status = CASE
            WHEN v_new_total_paid >= v_commission_amount THEN 'PAID'
            WHEN v_new_total_paid > 0 THEN 'PARTIAL'
            ELSE 'PENDING'
        END,
        updated_at = NOW()
    WHERE dc.id = p_deal_commission_id;

    -- คืนค่ารวม ๆ หลังจ่าย
    RETURN QUERY
    WITH payout_summary AS (
        SELECT
            cp.deal_commission_id,
            SUM(cp.amount) AS total_paid,
            MAX(cp.pay_date) AS last_pay_date
        FROM public.commission_payouts cp
        WHERE cp.deal_commission_id = p_deal_commission_id
        GROUP BY cp.deal_commission_id
    )
    SELECT
        dc.id AS deal_commission_id,
        dc.commission_amount,
        COALESCE(ps.total_paid, 0) AS total_paid,
        dc.commission_amount - COALESCE(ps.total_paid, 0) AS remaining_amount,
        dc.status,
        ps.last_pay_date
    FROM public.deal_commissions dc
    LEFT JOIN payout_summary ps
        ON ps.deal_commission_id = dc.id
    WHERE dc.id = p_deal_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_commission_payout(
    UUID, NUMERIC, DATE, TEXT, TEXT, UUID
) TO anon, authenticated, service_role;

-- =========================================================
-- 3. ปรับฟังก์ชันรายงาน V4 ให้ใช้ข้อมูลจาก commission_payouts
-- =========================================================

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
    WITH payout_summary AS (
        SELECT
            cp.deal_commission_id,
            SUM(cp.amount) AS total_paid,
            MAX(cp.pay_date) AS last_pay_date,
            SUM(
                cp.amount
            ) FILTER (
                WHERE
                    (start_date IS NULL OR cp.pay_date >= start_date)
                    AND (end_date IS NULL OR cp.pay_date < (end_date + INTERVAL '1 day'))
            ) AS paid_in_month
        FROM public.commission_payouts cp
        GROUP BY cp.deal_commission_id
    )
    SELECT
        dc.id                      AS deal_commission_id,
        dc.deal_id                 AS deal_id,
        d.title                    AS deal_title,
        COALESCE(dc.role, 'N/A')   AS role,
        COALESCE(dc.base_amount, 0)       AS deal_amount,
        COALESCE(dc.commission_amount, 0) AS commission_amount,

        COALESCE(ps.paid_in_month, 0)     AS paid_in_month,
        COALESCE(ps.total_paid, 0)        AS total_paid,
        (COALESCE(dc.commission_amount, 0) - COALESCE(ps.total_paid, 0)) AS remaining_amount,
        ps.last_pay_date                  AS last_pay_date,

        -- สถานะคำนวณสดจากยอดจ่ายจริง (ถ้าอยากใช้ dc.status ก็เปลี่ยนบรรทัดนี้ได้)
        CASE
            WHEN COALESCE(ps.total_paid, 0) >= COALESCE(dc.commission_amount, 0)
                THEN 'PAID'
            WHEN COALESCE(ps.total_paid, 0) > 0
                THEN 'PARTIAL'
            ELSE 'PENDING'
        END AS status
    FROM public.deal_commissions dc
    JOIN public.deals d
        ON d.id = dc.deal_id
    LEFT JOIN payout_summary ps
        ON ps.deal_commission_id = dc.id
    WHERE 
        (pid IS NULL OR dc.profile_id = pid)
        AND (start_date IS NULL OR d.created_at >= start_date::timestamp)
        AND (end_date   IS NULL OR d.created_at < (end_date + INTERVAL '1 day')::timestamp)
    ORDER BY d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_v4(UUID, DATE, DATE)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
