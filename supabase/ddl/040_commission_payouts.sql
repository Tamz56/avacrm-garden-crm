-- 1) ตารางเก็บประวัติการจ่ายค่าคอมมิชชั่น (ถ้ายังไม่สร้าง)
CREATE TABLE IF NOT EXISTS public.commission_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,          -- อ้างถึง profiles.id (Sales/Leader)
    month DATE NOT NULL,               -- เดือนที่จ่าย (ใช้วันที่แรกของเดือน)
    amount NUMERIC(12,2) NOT NULL,     -- จำนวนเงินที่จ่าย
    status TEXT DEFAULT 'Paid',        -- Paid / Partial / Cancelled ฯลฯ
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) View สรุปยอดที่ควรจ่าย-ยอดที่จ่ายแล้ว-คงเหลือ รายคน/รายเดือน
CREATE OR REPLACE VIEW public.v_commission_payouts AS
WITH monthly_due AS (
    SELECT
        d.owner_id AS profile_id,                          -- 👈 ใช้ owner_id แทน user_id
        date_trunc('month', dc.created_at)::date AS month,
        SUM(dc.commission_amount) AS commission_due
    FROM public.deal_commissions dc
    JOIN public.deals d
        ON d.id = dc.deal_id
    WHERE d.owner_id IS NOT NULL
    GROUP BY 1, 2
),

monthly_paid AS (
    SELECT
        cp.profile_id,
        cp.month,
        SUM(cp.amount) AS paid_amount
    FROM public.commission_payments cp
    GROUP BY 1, 2
)

SELECT
    md.month,
    md.profile_id,
    COALESCE(p.full_name, 'Unknown') AS full_name,
    md.commission_due,
    COALESCE(mp.paid_amount, 0) AS paid_amount,
    md.commission_due - COALESCE(mp.paid_amount, 0) AS remaining_amount,
    CASE
        WHEN COALESCE(mp.paid_amount, 0) >= md.commission_due THEN 'Paid'
        WHEN COALESCE(mp.paid_amount, 0) > 0 THEN 'Partial'
        ELSE 'Unpaid'
    END AS payment_status
FROM monthly_due md
LEFT JOIN monthly_paid mp
    ON md.profile_id = mp.profile_id
   AND md.month = mp.month
LEFT JOIN public.profiles p
    ON p.id = md.profile_id
ORDER BY md.month DESC, full_name;

-- 3) RPC สำหรับบันทึกการจ่ายค่าคอมมิชชั่นจากหน้า AvaCRM
CREATE OR REPLACE FUNCTION public.set_commission_payment(
    p_profile_id UUID,
    p_month DATE,
    p_total_commission NUMERIC,  -- ตอนนี้ frontend ยังไม่ใช้ แต่เผื่อในอนาคต
    p_pay_amount NUMERIC,
    p_status TEXT,
    p_note TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.commission_payments (profile_id, month, amount, status, note)
    VALUES (p_profile_id, p_month, p_pay_amount, p_status, p_note);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
