-- ============================================================
-- แก้ไข error 42P10: ON CONFLICT specification
-- สำหรับ deal_commissions table
-- รันไฟล์นี้ทั้งหมดใน Supabase SQL Editor
-- ============================================================

-- ========================================
-- STEP 1: ตรวจสอบโครงสร้างตาราง
-- ========================================
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deal_commissions'
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: ดู constraints ปัจจุบัน
-- ========================================
SELECT 
  conname AS constraint_name,
  contype AS type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
ORDER BY contype, conname;

-- ========================================
-- STEP 3: เพิ่ม UNIQUE constraint บน (deal_id, role)
-- ========================================

-- ลบ constraint เก่าทั้งหมดที่อาจซ้ำ
ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_uniq CASCADE;

ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_key CASCADE;

ALTER TABLE public.deal_commissions
DROP CONSTRAINT IF EXISTS deal_commissions_unique CASCADE;

-- เพิ่ม UNIQUE constraint ใหม่
ALTER TABLE public.deal_commissions
ADD CONSTRAINT deal_commissions_deal_id_role_uniq
UNIQUE (deal_id, role);

-- ตรวจสอบว่าสร้างสำเร็จ
SELECT 
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND conname = 'deal_commissions_deal_id_role_uniq';

-- คาดหวัง: UNIQUE (deal_id, role)

-- ========================================
-- STEP 4: อัปเดตฟังก์ชัน recalc_deal_commissions
-- ให้ใช้ ON CONFLICT ที่ตรงกับ constraint
-- ========================================

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

    -- ใช้ UPSERT แทน DELETE + INSERT
    -- เพื่อป้องกัน race condition และใช้ UNIQUE constraint
    
    -- Sales Agent Commission
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
      status = EXCLUDED.status,
      updated_at = NOW();

    -- Team Leader Commission
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
      status = EXCLUDED.status,
      updated_at = NOW();

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 5: ทดสอบว่าฟังก์ชันทำงานได้
-- ========================================

-- ดูข้อมูลตัวอย่าง deal_commissions
SELECT * FROM public.deal_commissions 
ORDER BY created_at DESC 
LIMIT 10;

-- ถ้ามีดีลอยู่แล้ว ลองทดสอบ recalc
-- SELECT public.recalc_deal_commissions('<DEAL_ID>');

-- ========================================
-- STEP 6: เพิ่ม comment
-- ========================================

COMMENT ON CONSTRAINT deal_commissions_deal_id_role_uniq ON public.deal_commissions 
IS 'ป้องกันการมีคอมมิชชันซ้ำสำหรับ role เดียวกันในดีลเดียวกัน - แก้ error 42P10';

COMMENT ON FUNCTION public.recalc_deal_commissions(UUID) 
IS 'คำนวณคอมมิชชันใหม่สำหรับดีล ใช้ UPSERT (ON CONFLICT) เพื่อป้องกัน duplicate และ race condition';

-- ========================================
-- สรุป: สิ่งที่ทำ
-- ========================================
-- 1. เพิ่ม UNIQUE constraint บน (deal_id, role)
-- 2. แก้ recalc_deal_commissions ให้ใช้ ON CONFLICT (deal_id, role)
-- 3. ใช้ COALESCE กับ base_amount เพื่อป้องกัน NULL
-- 4. เพิ่ม updated_at ใน DO UPDATE

-- ตอนนี้ RPC close_deal_and_update_stock ควรทำงานได้แล้ว!
