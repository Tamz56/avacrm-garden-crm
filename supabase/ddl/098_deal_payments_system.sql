-- 098_deal_payments_system.sql
-- สร้างระบบการชำระเงิน (Partial Payments)
-- 1. ตาราง deal_payments
-- 2. Trigger อัปเดตสถานะใน deals
-- 3. RPC สำหรับดึงข้อมูล

-- ============================================================
-- 1. ปรับปรุง Constraint ของ deals.payment_status ให้รองรับ 'unpaid'
-- ============================================================
DO $$
BEGIN
    -- ลบ constraint เดิม
    ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_payment_status_check;
    
    -- เพิ่ม constraint ใหม่ที่รองรับ unpaid
    ALTER TABLE public.deals
    ADD CONSTRAINT deals_payment_status_check 
    CHECK (payment_status IN ('pending', 'unpaid', 'partial', 'paid', 'cancelled'));
    
    -- Migrate 'pending' -> 'unpaid' (Optional: ถ้าต้องการให้เหมือนกันหมด)
    -- UPDATE public.deals SET payment_status = 'unpaid' WHERE payment_status = 'pending';
END $$;

-- ============================================================
-- 2. สร้างตาราง deal_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deal_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL DEFAULT 'transfer',   -- 'transfer' | 'cash' | 'other'
    status TEXT NOT NULL DEFAULT 'verified',   -- 'verified' | 'pending' | 'cancelled'
    note TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_payments_deal_id ON public.deal_payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_payments_payment_date ON public.deal_payments(payment_date);

-- RLS
ALTER TABLE public.deal_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'deal_payments'
          AND policyname = 'deal_payments_select_authenticated'
    ) THEN
        CREATE POLICY "deal_payments_select_authenticated"
        ON public.deal_payments
        FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'deal_payments'
          AND policyname = 'deal_payments_modify_authenticated'
    ) THEN
        CREATE POLICY "deal_payments_modify_authenticated"
        ON public.deal_payments
        FOR INSERT, UPDATE, DELETE
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END
$$;

-- ============================================================
-- 3. Trigger Function: update_deal_payment_status_from_payments
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_deal_payment_status_from_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_deal_id UUID;
    v_total   NUMERIC(12, 2);
    v_paid    NUMERIC(12, 2);
BEGIN
    -- ใช้ deal_id จาก NEW ถ้ามี, ไม่งั้นใช้จาก OLD (กรณี DELETE)
    v_deal_id := COALESCE(NEW.deal_id, OLD.deal_id);

    -- ดึงยอดรวมดีล (ใช้ grand_total) + ยอดที่ชำระแล้ว (เฉพาะ status = 'verified')
    SELECT
        d.grand_total,   -- ใช้ grand_total แทน total_amount
        COALESCE(SUM(
            CASE WHEN dp.status = 'verified' THEN dp.amount ELSE 0 END
        ), 0)
    INTO v_total, v_paid
    FROM public.deals d
    LEFT JOIN public.deal_payments dp
        ON dp.deal_id = d.id
    WHERE d.id = v_deal_id
    GROUP BY d.grand_total;

    -- ถ้าไม่เจอดีล (ไม่ควรเกิด) ก็จบเลย
    IF v_total IS NULL THEN
        RETURN NULL;
    END IF;

    -- อัปเดตสถานะการชำระเงินตามยอดที่จ่ายแล้ว
    IF v_paid <= 0 THEN
        UPDATE public.deals
        SET payment_status = 'unpaid'
        WHERE id = v_deal_id;

    ELSIF v_paid < v_total THEN
        UPDATE public.deals
        SET payment_status = 'partial'
        WHERE id = v_deal_id;

    ELSE
        UPDATE public.deals
        SET payment_status = 'paid'
        WHERE id = v_deal_id;
    END IF;

    RETURN NULL;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS trg_update_deal_payment_status
ON public.deal_payments;

CREATE TRIGGER trg_update_deal_payment_status
AFTER INSERT OR UPDATE OR DELETE
ON public.deal_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_deal_payment_status_from_payments();

-- ============================================================
-- 4. RPC: get_deal_payment_summary
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_deal_payment_summary(p_deal_id UUID)
RETURNS TABLE (
    deal_id          UUID,
    total_amount     NUMERIC(12, 2),
    paid_amount      NUMERIC(12, 2),
    remaining_amount NUMERIC(12, 2),
    is_fully_paid    BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id AS deal_id,
        d.grand_total AS total_amount,   -- ใช้ grand_total
        COALESCE(SUM(
            CASE WHEN dp.status = 'verified' THEN dp.amount ELSE 0 END
        ), 0) AS paid_amount,
        d.grand_total - COALESCE(SUM(
            CASE WHEN dp.status = 'verified' THEN dp.amount ELSE 0 END
        ), 0) AS remaining_amount,
        (d.grand_total - COALESCE(SUM(
            CASE WHEN dp.status = 'verified' THEN dp.amount ELSE 0 END
        ), 0)) <= 0 AS is_fully_paid
    FROM public.deals d
    LEFT JOIN public.deal_payments dp
        ON dp.deal_id = d.id
    WHERE d.id = p_deal_id
    GROUP BY d.id, d.grand_total;
END;
$$;

-- ============================================================
-- 5. RPC: get_monthly_payment_summary
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_monthly_payment_summary(
    p_month_start DATE,
    p_month_end   DATE
)
RETURNS TABLE (
    total_payments      NUMERIC(14, 2),
    verified_payments   NUMERIC(14, 2),
    pending_payments    NUMERIC(14, 2),
    cancelled_payments  NUMERIC(14, 2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT
        COALESCE(SUM(amount), 0) AS total_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) AS verified_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'cancelled'), 0) AS cancelled_payments
    FROM public.deal_payments
    WHERE payment_date >= p_month_start
      AND payment_date <  p_month_end;
$$;
