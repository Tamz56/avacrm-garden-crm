-- ============================================================
-- แก้ไข error 42P10 แบบรันครั้งเดียวจบ
-- Copy ทั้งหมดไปวางใน Supabase SQL Editor แล้วกด RUN
-- ============================================================

-- ========================================
-- 1. ลบ constraint เก่าทั้งหมด
-- ========================================
DO $$ 
BEGIN
    -- ลบ constraint ที่อาจมีอยู่
    ALTER TABLE public.deal_commissions DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_uniq CASCADE;
    ALTER TABLE public.deal_commissions DROP CONSTRAINT IF EXISTS deal_commissions_deal_id_role_key CASCADE;
    ALTER TABLE public.deal_commissions DROP CONSTRAINT IF EXISTS deal_commissions_unique CASCADE;
    
    RAISE NOTICE 'ลบ constraints เก่าเรียบร้อย';
END $$;

-- ========================================
-- 2. เพิ่ม UNIQUE constraint ใหม่
-- ========================================
ALTER TABLE public.deal_commissions
ADD CONSTRAINT deal_commissions_deal_id_role_uniq
UNIQUE (deal_id, role);

-- ตรวจสอบว่าสร้างสำเร็จ
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_constraint
    WHERE conrelid = 'public.deal_commissions'::regclass
      AND conname = 'deal_commissions_deal_id_role_uniq';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ UNIQUE constraint ถูกสร้างเรียบร้อย';
    ELSE
        RAISE EXCEPTION '❌ ไม่สามารถสร้าง UNIQUE constraint ได้';
    END IF;
END $$;

-- ========================================
-- 3. อัปเดตฟังก์ชัน recalc_deal_commissions
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

-- ตรวจสอบว่าฟังก์ชันถูกอัปเดต
DO $$
DECLARE
    v_definition TEXT;
BEGIN
    SELECT pg_get_functiondef(oid) INTO v_definition
    FROM pg_proc
    WHERE proname = 'recalc_deal_commissions'
      AND pronamespace = 'public'::regnamespace;
    
    IF v_definition LIKE '%ON CONFLICT%' THEN
        RAISE NOTICE '✅ ฟังก์ชัน recalc_deal_commissions ถูกอัปเดตเรียบร้อย';
    ELSE
        RAISE WARNING '⚠️ ฟังก์ชันอาจยังไม่มี ON CONFLICT';
    END IF;
END $$;

-- ========================================
-- 4. สรุปผลลัพธ์
-- ========================================
SELECT 
  '✅ UNIQUE Constraint' AS item,
  conname AS name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.deal_commissions'::regclass
  AND conname = 'deal_commissions_deal_id_role_uniq'

UNION ALL

SELECT 
  '✅ Function Updated',
  'recalc_deal_commissions',
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%ON CONFLICT%' 
    THEN 'มี ON CONFLICT แล้ว'
    ELSE 'ยังไม่มี ON CONFLICT'
  END
FROM pg_proc
WHERE proname = 'recalc_deal_commissions'
  AND pronamespace = 'public'::regnamespace;

-- ========================================
-- ถ้าเห็น 2 แถวด้านบนแสดงว่าพร้อมแล้ว!
-- กลับไปทดสอบปิดดีลในเว็บได้เลย
-- ========================================
