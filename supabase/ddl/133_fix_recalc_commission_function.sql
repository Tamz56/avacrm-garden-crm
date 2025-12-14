-- 133_fix_recalc_commission_function.sql
-- แก้ไขฟังก์ชัน recalc_deal_commissions ให้ใช้ชื่อคอลัมน์ที่ถูกต้องจากตาราง deals
-- (แก้จาก referral_profile_id -> referral_sales_id ฯลฯ)

DROP FUNCTION IF EXISTS public.recalc_deal_commissions(UUID);

CREATE OR REPLACE FUNCTION public.recalc_deal_commissions(p_deal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deal RECORD;
    v_config RECORD;
BEGIN
    -- 1. ดึงข้อมูลดีล (ใช้ชื่อคอลัมน์ที่ถูกต้อง)
    SELECT 
        id, 
        total_amount, 
        closing_sales_id,   -- Sales Agent
        referral_sales_id,  -- Referral
        team_leader_id      -- Team Leader
    INTO v_deal 
    FROM public.deals 
    WHERE id = p_deal_id;

    IF v_deal.id IS NULL THEN
        RAISE EXCEPTION 'Deal % not found', p_deal_id;
    END IF;

    -- 2. ดึง Config ล่าสุด
    SELECT * INTO v_config FROM public.v_commission_config_single;
    
    IF v_config IS NULL THEN
        RAISE EXCEPTION 'No active commission configuration found';
    END IF;

    -- 3. Sales Agent Commission (UPSERT)
    IF v_deal.closing_sales_id IS NOT NULL THEN
        INSERT INTO public.deal_commissions (
            deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id
        )
        VALUES (
            p_deal_id, 
            'sales_agent', 
            v_deal.closing_sales_id, 
            v_config.sales_rate, 
            COALESCE(v_deal.total_amount, 0), 
            COALESCE(v_deal.total_amount, 0) * v_config.sales_rate, 
            'PENDING', 
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
    END IF;

    -- 4. Referral Commission (UPSERT)
    IF v_deal.referral_sales_id IS NOT NULL THEN
        INSERT INTO public.deal_commissions (
            deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id
        )
        VALUES (
            p_deal_id, 
            'referral', 
            v_deal.referral_sales_id, 
            v_config.referral_rate, 
            COALESCE(v_deal.total_amount, 0), 
            COALESCE(v_deal.total_amount, 0) * v_config.referral_rate, 
            'PENDING', 
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
    END IF;

    -- 5. Team Leader Commission (UPSERT)
    IF v_deal.team_leader_id IS NOT NULL THEN
        INSERT INTO public.deal_commissions (
            deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id
        )
        VALUES (
            p_deal_id, 
            'team_leader', 
            v_deal.team_leader_id, 
            v_config.team_rate, 
            COALESCE(v_deal.total_amount, 0), 
            COALESCE(v_deal.total_amount, 0) * v_config.team_rate, 
            'PENDING', 
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
    END IF;

    RETURN TRUE;
END;
$$;
