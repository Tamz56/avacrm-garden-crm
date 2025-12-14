-- 102_step1_create_table.sql
-- สร้างตาราง deal_payments แยกออกมาตามคำขอ

-- 1. สร้างตารางเก็บประวัติการชำระเงินของดีล
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

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_deal_payments_deal_id
    ON public.deal_payments(deal_id);

CREATE INDEX IF NOT EXISTS idx_deal_payments_payment_date
    ON public.deal_payments(payment_date);

-- 3. เปิด RLS
ALTER TABLE public.deal_payments ENABLE ROW LEVEL SECURITY;

-- 4. Policy (Optional - ให้สิทธิ์เบื้องต้นเพื่อให้ insert/select ได้)
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

-- 5. Verify
SELECT * FROM public.deal_payments LIMIT 1;
