-- 151_patch_commission_calculation.sql
-- Patch recalc_deal_commissions to explicitly handle "Solo Sales Agent" case

CREATE OR REPLACE FUNCTION public.recalc_deal_commissions(p_deal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deal RECORD;
    v_config RECORD;
    v_rate NUMERIC;
BEGIN
    -- 1. Get Deal Info
    -- We assume columns: closing_sales_id, referral_sales_id, team_leader_id exist
    -- If not, we might need to fallback to 'created_by' or other columns.
    -- Based on previous context (133), these columns should exist.
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

    -- 2. Get Config
    SELECT * INTO v_config FROM public.v_commission_config_single;
    
    IF v_config IS NULL THEN
        RAISE EXCEPTION 'No active commission configuration found';
    END IF;

    -- 3. Sales Agent Commission
    IF v_deal.closing_sales_id IS NOT NULL THEN
        -- Determine Rate
        -- Logic: If Solo (No Referral, No Leader), use sales_rate (or solo_rate if intended)
        -- User requested to use sales_rate in the snippet.
        v_rate := v_config.sales_rate;

        -- Optional: If you want to use solo_rate for solo cases, uncomment below:
        /*
        IF v_deal.referral_sales_id IS NULL AND v_deal.team_leader_id IS NULL THEN
             v_rate := v_config.solo_rate;
        END IF;
        */

        INSERT INTO public.deal_commissions (
            deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id
        )
        VALUES (
            p_deal_id, 
            'sales_agent', 
            v_deal.closing_sales_id, 
            v_rate, 
            COALESCE(v_deal.total_amount, 0), 
            COALESCE(v_deal.total_amount, 0) * v_rate, 
            'pending', 
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

    -- 4. Referral Commission
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
            'pending', 
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

    -- 5. Team Leader Commission
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
            'pending', 
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

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
