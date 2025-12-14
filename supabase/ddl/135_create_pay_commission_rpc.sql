-- 135_create_pay_commission_rpc.sql
-- สร้าง RPC pay_commission เพื่อรองรับ Frontend API ใหม่
-- โดยภายในจะเรียก record_commission_payout หรือทำงานเทียบเท่า

CREATE OR REPLACE FUNCTION public.pay_commission(
    p_deal_commission_id UUID,
    p_amount NUMERIC,
    p_paid_at DATE,
    p_method TEXT,
    p_note TEXT,
    p_created_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- เรียกใช้ record_commission_payout ตัวเดิมที่มีอยู่แล้ว
    -- โดย map parameter ให้ตรงกัน
    PERFORM public.record_commission_payout(
        p_commission_id := p_deal_commission_id,
        p_amount := p_amount,
        p_date := COALESCE(p_paid_at, CURRENT_DATE),
        p_method := p_method,
        p_note := p_note
        -- p_actor := p_created_by -- ถ้า record_commission_payout รองรับ actor ก็ใส่ได้ แต่ตอนนี้ยังไม่มี
    );

    -- คืนค่าแถวที่อัปเดตล่าสุดกลับไป (เพื่อให้ Frontend เอาไปอัปเดต state ถ้าต้องการ)
    SELECT to_jsonb(dc) INTO v_result
    FROM public.deal_commissions dc
    WHERE dc.id = p_deal_commission_id;

    RETURN v_result;
END;
$$;
