-- ============================================================
-- RPC Function: mark_deal_paid
-- อัปเดตสถานะการชำระเงินของดีล
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_deal_paid(p_deal_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_deal RECORD;
BEGIN
  -- อัปเดตสถานะการชำระเงิน (ใช้ lowercase)
  UPDATE public.deals
  SET 
    payment_status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_deal_id
  RETURNING * INTO v_deal;

  -- ตรวจสอบว่าพบดีลหรือไม่
  IF v_deal IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Deal not found'
    );
  END IF;

  -- ส่งข้อมูลดีลที่อัปเดตกลับ
  RETURN jsonb_build_object(
    'ok', true,
    'deal', row_to_json(v_deal)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.mark_deal_paid(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.mark_deal_paid(UUID) IS 
'อัปเดตสถานะการชำระเงินของดีลเป็น Paid และบันทึกเวลาที่ชำระ';

-- ============================================================
-- ทดสอบ
-- ============================================================
-- SELECT public.mark_deal_paid('<DEAL_ID>');
