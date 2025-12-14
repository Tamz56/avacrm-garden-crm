-- ============================================================
-- แก้ไข deal_commissions + recalc_deal_commissions
-- เพื่อรองรับ ON CONFLICT และป้องกัน duplicate
-- ============================================================

-- 1) เพิ่ม UNIQUE constraint บน (deal_id, role)
-- ============================================================
ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_uniq;

ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_key;

ALTER TABLE public.deal_commissions
ADD CONSTRAINT deal_commissions_deal_id_role_uniq
UNIQUE (deal_id, role);

-- ตรวจสอบว่า constraint ถูกสร้างแล้ว
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND conname = 'deal_commissions_deal_id_role_uniq';

-- 2) อัปเดต recalc_deal_commissions ให้ใช้ ON CONFLICT
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_deal_commissions(p_deal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_deal_amount NUMERIC;
    v_config RECORD;
    v_deal_owner_id UUID;
    v_referral_profile_id UUID;
BEGIN
    -- Get deal details
    SELECT total_amount, created_by INTO v_deal_amount, v_deal_owner_id 
    FROM public.deals 
    WHERE id = p_deal_id;

    IF v_deal_amount IS NULL THEN
        RAISE EXCEPTION 'Deal not found';
    END IF;

    -- Get latest config
    SELECT * INTO v_config FROM public.v_commission_config_single;
    
    IF v_config IS NULL THEN
        RAISE EXCEPTION 'No active commission configuration found';
    END IF;

    -- ใช้ ON CONFLICT แทน DELETE + INSERT
    -- เพื่อป้องกันปัญหา race condition และ duplicate
    
    -- 2. Sales Agent
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
    ON CONFLICT ON CONSTRAINT deal_commissions_deal_id_role_uniq
    DO UPDATE SET
      profile_id = EXCLUDED.profile_id,
      commission_rate = EXCLUDED.commission_rate,
      base_amount = EXCLUDED.base_amount,
      commission_amount = EXCLUDED.commission_amount,
      config_id = EXCLUDED.config_id,
      status = EXCLUDED.status;

    -- 3. Team Lead
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
    ON CONFLICT ON CONSTRAINT deal_commissions_deal_id_role_uniq
    DO UPDATE SET
      commission_rate = EXCLUDED.commission_rate,
      base_amount = EXCLUDED.base_amount,
      commission_amount = EXCLUDED.commission_amount,
      config_id = EXCLUDED.config_id,
      status = EXCLUDED.status;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3) ทดสอบว่าฟังก์ชันทำงานได้
-- ============================================================
-- SELECT public.recalc_deal_commissions('<DEAL_ID>');

COMMENT ON CONSTRAINT deal_commissions_deal_id_role_uniq ON public.deal_commissions 
IS 'ป้องกันการมีคอมมิชชันซ้ำสำหรับ role เดียวกันในดีลเดียวกัน';

COMMENT ON FUNCTION public.recalc_deal_commissions IS 'คำนวณคอมมิชชันใหม่สำหรับดีล ใช้ ON CONFLICT เพื่อป้องกัน duplicate';
