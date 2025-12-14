-- 106_create_commission_payout_system.sql
-- สร้างระบบจ่ายค่าคอมมิชชั่นจริง (Commission Payouts)

-- ============================================================
-- 1. สร้างตาราง deal_commissions (ถ้ายังไม่มี)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deal_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    role TEXT NOT NULL,                               -- 'sales_agent' | 'referral' | 'team_leader' ...
    base_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,    -- ฐานคิดค่าคอม (เช่น มูลค่าดีล)
    rate NUMERIC(6, 4) NOT NULL DEFAULT 0,            -- อัตราค่าคอม เช่น 0.03
    commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, -- ยอดคอมฯ ที่ควรได้
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,    -- ยอดที่จ่ายแล้ว
    status TEXT NOT NULL DEFAULT 'PENDING',           -- 'PENDING' | 'PARTIAL' | 'PAID'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- เผื่อมีตารางเดิมอยู่แล้ว แต่ยังไม่มีคอลัมน์เหล่านี้
ALTER TABLE public.deal_commissions
    ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_deal_commissions_deal_id
    ON public.deal_commissions(deal_id);

CREATE INDEX IF NOT EXISTS idx_deal_commissions_profile_id
    ON public.deal_commissions(profile_id);

-- ============================================================
-- 2. สร้างตาราง commission_payouts สำหรับการจ่ายจริง
-- ============================================================
CREATE TABLE IF NOT EXISTS public.commission_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_commission_id UUID NOT NULL
        REFERENCES public.deal_commissions(id) ON DELETE CASCADE,
    pay_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL DEFAULT 'transfer',      -- 'transfer' | 'cash' | 'salary' | ...
    note TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_commission_id
    ON public.commission_payouts(deal_commission_id);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_pay_date
    ON public.commission_payouts(pay_date);

-- ============================================================
-- 3. RLS เบื้องต้น
-- ============================================================
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'commission_payouts'
          AND policyname = 'commission_payouts_select_authenticated'
    ) THEN
        CREATE POLICY "commission_payouts_select_authenticated"
        ON public.commission_payouts
        FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'commission_payouts'
          AND policyname = 'commission_payouts_modify_authenticated'
    ) THEN
        CREATE POLICY "commission_payouts_modify_authenticated"
        ON public.commission_payouts
        FOR INSERT, UPDATE, DELETE
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END
$$;

-- ============================================================
-- 4. Function & Trigger: อัปเดต paid_amount และ status ของ deal_commissions
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_deal_commission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_commission_id UUID;
    v_target_amount NUMERIC(12, 2);
    v_paid_amount   NUMERIC(12, 2);
BEGIN
    v_commission_id := COALESCE(NEW.deal_commission_id, OLD.deal_commission_id);

    -- รวมยอดที่จ่ายจริงทั้งหมดจาก commission_payouts
    SELECT
        dc.commission_amount,
        COALESCE(SUM(cp.amount), 0)
    INTO
        v_target_amount,
        v_paid_amount
    FROM public.deal_commissions dc
    LEFT JOIN public.commission_payouts cp
        ON cp.deal_commission_id = dc.id
    WHERE dc.id = v_commission_id
    GROUP BY dc.commission_amount;

    IF v_target_amount IS NULL THEN
        RETURN NULL;
    END IF;

    -- อัปเดต paid_amount และ status
    UPDATE public.deal_commissions
    SET
        paid_amount = v_paid_amount,
        status = CASE
            WHEN v_paid_amount <= 0 THEN 'PENDING'
            WHEN v_paid_amount < v_target_amount THEN 'PARTIAL'
            ELSE 'PAID'
        END
    WHERE id = v_commission_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_deal_commission_status
ON public.commission_payouts;

CREATE TRIGGER trg_update_deal_commission_status
AFTER INSERT OR UPDATE OR DELETE
ON public.commission_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_deal_commission_status();

-- ============================================================
-- 5. RPC สำหรับหน้า “ค่าคอมฯ ของดีลนี้”
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_deal_commission_summary(p_deal_id UUID)
RETURNS TABLE (
    deal_commission_id UUID,
    deal_id            UUID,
    profile_id         UUID,
    profile_name       TEXT,
    role               TEXT,
    base_amount        NUMERIC(12, 2),
    rate               NUMERIC(6, 4),
    commission_amount  NUMERIC(12, 2),
    paid_amount        NUMERIC(12, 2),
    remaining_amount   NUMERIC(12, 2),
    status             TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT
        dc.id                AS deal_commission_id,
        dc.deal_id,
        dc.profile_id,
        COALESCE(p.full_name, p.display_name, 'Unknown') AS profile_name,
        dc.role,
        dc.base_amount,
        dc.rate,
        dc.commission_amount,
        dc.paid_amount,
        (dc.commission_amount - dc.paid_amount) AS remaining_amount,
        dc.status
    FROM public.deal_commissions dc
    LEFT JOIN public.profiles p
        ON p.id = dc.profile_id
    WHERE dc.deal_id = p_deal_id
    ORDER BY dc.role, profile_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_deal_commission_summary(UUID)
  TO anon, authenticated, service_role;

-- ⚡ บังคับ Reload Schema Cache ⚡
NOTIFY pgrst, 'reload schema';
