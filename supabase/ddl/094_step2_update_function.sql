-- ============================================================
-- STEP 3: อัปเดตฟังก์ชัน recalc_deal_commissions
-- รันทั้งหมดพร้อมกัน (ทั้ง function)
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_deal_commissions(p_deal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_deal_amount NUMERIC;
    v_config RECORD;
    v_deal_owner_id UUID;
BEGIN
    -- Get deal details
    SELECT total_amount, created_by 
    INTO v_deal_amount, v_deal_owner_id 
    FROM public.deals 
    WHERE id = p_deal_id;

    IF v_deal_amount IS NULL THEN
        RAISE EXCEPTION 'Deal % not found', p_deal_id;
    END IF;

    -- Get latest config
    SELECT * INTO v_config FROM public.v_commission_config_single;
    
    IF v_config IS NULL THEN
        RAISE EXCEPTION 'No active commission configuration found';
    END IF;

    -- Sales Agent Commission (UPSERT)
    INSERT INTO public.deal_commissions (
      deal_id, 
      role, 
      profile_id, 
      commission_rate, 
      base_amount, 
      commission_amount, 
      status, 
      config_id
    )
    VALUES (
      p_deal_id, 
      'sales_agent', 
      v_deal_owner_id, 
      v_config.sales_rate, 
      COALESCE(v_deal_amount, 0), 
      COALESCE(v_deal_amount, 0) * v_config.sales_rate, 
      'Pending', 
      v_config.id
    )
    ON CONFLICT (deal_id, role) 
    DO UPDATE SET
      profile_id = EXCLUDED.profile_id,
      commission_rate = EXCLUDED.commission_rate,
      base_amount = EXCLUDED.base_amount,
      commission_amount = EXCLUDED.commission_amount,
      config_id = EXCLUDED.config_id,
      status = EXCLUDED.status;

    -- Team Leader Commission (UPSERT)
    INSERT INTO public.deal_commissions (
      deal_id, 
      role, 
      commission_rate, 
      base_amount, 
      commission_amount, 
      status, 
      config_id
    )
    VALUES (
      p_deal_id, 
      'team_leader', 
      v_config.team_rate, 
      COALESCE(v_deal_amount, 0), 
      COALESCE(v_deal_amount, 0) * v_config.team_rate, 
      'Pending', 
      v_config.id
    )
    ON CONFLICT (deal_id, role)
    DO UPDATE SET
      commission_rate = EXCLUDED.commission_rate,
      base_amount = EXCLUDED.base_amount,
      commission_amount = EXCLUDED.commission_amount,
      config_id = EXCLUDED.config_id,
      status = EXCLUDED.status;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 3.1: ยืนยันว่าฟังก์ชันถูกอัปเดตแล้ว
-- ========================================

SELECT 
  proname AS function_name,
  pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'recalc_deal_commissions'
  AND pronamespace = 'public'::regnamespace;

-- ควรเห็นฟังก์ชันที่มี ON CONFLICT (deal_id, role)
