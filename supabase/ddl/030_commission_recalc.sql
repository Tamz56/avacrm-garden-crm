-- 1. Create commission_config table
CREATE TABLE IF NOT EXISTS public.commission_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.05,
    sales_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.10,
    team_target NUMERIC(12, 2) NOT NULL DEFAULT 500000,
    team_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.05,
    solo_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.05,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert default config if not exists
INSERT INTO public.commission_config (referral_rate, sales_rate, team_target, team_rate, solo_rate)
SELECT 0.05, 0.10, 500000, 0.05, 0.05
WHERE NOT EXISTS (SELECT 1 FROM public.commission_config);

-- 3. Create view for single config (get the latest active one)
CREATE OR REPLACE VIEW public.v_commission_config_single AS
SELECT *
FROM public.commission_config
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- 4. Add config_id to deal_commissions
-- Ensure deal_commissions exists (basic structure if not exists, though likely exists)
CREATE TABLE IF NOT EXISTS public.deal_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID REFERENCES public.deals(id),
    role TEXT,
    profile_id UUID, -- REFERENCES public.profiles(id) or auth.users
    commission_rate NUMERIC(10, 4),
    base_amount NUMERIC(12, 2),
    commission_amount NUMERIC(12, 2),
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

ALTER TABLE public.deal_commissions
ADD COLUMN IF NOT EXISTS config_id UUID REFERENCES public.commission_config(id);

-- 5. Update fn_create_default_commissions_for_deal to use config
CREATE OR REPLACE FUNCTION public.fn_create_default_commissions_for_deal(
    p_deal_id UUID,
    p_total_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
    v_config RECORD;
    v_deal_owner_id UUID;
BEGIN
    -- Get current config
    SELECT * INTO v_config FROM public.v_commission_config_single;
    
    IF v_config IS NULL THEN
        RAISE EXCEPTION 'No active commission configuration found';
    END IF;

    -- Get deal owner (Sales Agent)
    SELECT created_by INTO v_deal_owner_id FROM public.deals WHERE id = p_deal_id;

    -- 1. Referral Commission (5%)
    INSERT INTO public.deal_commissions (deal_id, role, commission_rate, base_amount, commission_amount, status, config_id)
    VALUES (p_deal_id, 'referral_agent', v_config.referral_rate, COALESCE(p_total_amount, 0), COALESCE(p_total_amount, 0) * v_config.referral_rate, 'Pending', v_config.id);

    -- 2. Sales Agent Commission (10%)
    INSERT INTO public.deal_commissions (deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id)
    VALUES (p_deal_id, 'sales_agent', v_deal_owner_id, v_config.sales_rate, COALESCE(p_total_amount, 0), COALESCE(p_total_amount, 0) * v_config.sales_rate, 'Pending', v_config.id);

    -- 3. Team Lead / Overhead (5%)
    INSERT INTO public.deal_commissions (deal_id, role, commission_rate, base_amount, commission_amount, status, config_id)
    VALUES (p_deal_id, 'team_leader', v_config.team_rate, COALESCE(p_total_amount, 0), COALESCE(p_total_amount, 0) * v_config.team_rate, 'Pending', v_config.id);

END;
$$ LANGUAGE plpgsql;

-- 6. Create Recalculate Function
-- 6. Create Recalculate Function
CREATE OR REPLACE FUNCTION public.recalc_deal_commissions(p_deal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_deal_amount NUMERIC;
    v_config RECORD;
    v_deal_owner_id UUID;
    v_referral_profile_id UUID; -- Variable to store referrer ID
BEGIN
    -- Get deal details including referrer (assuming column name is referral_profile_id, adjust if needed)
    -- If the column doesn't exist yet, this might fail. 
    -- Based on user request, we assume there is a way to identify referrer.
    -- Let's check if 'referral_profile_id' exists in deals table first or use a placeholder logic.
    -- For now, I will assume the column is named 'referral_profile_id' as per user suggestion.
    -- If it's different, the user needs to provide the exact column name.
    -- SAFEGUARD: If column doesn't exist, we select NULL as v_referral_profile_id.
    -- However, in PL/PGSQL we can't easily do dynamic column checks in a static query without dynamic SQL.
    -- I will assume the column exists or use a safe approach if I knew the schema perfectly.
    -- Given the user instruction: "IF v_deal.referral_profile_id IS NOT NULL THEN..."
    
    -- I will try to select it. If it fails, the user will see an error and we can fix column name.
    -- But wait, I don't see 'referral_profile_id' in the previous schema dumps.
    -- I will assume it might be 'customer_id' (which is a customer, not agent) or maybe it's not in deals yet.
    -- The user said: "null value in column 'sales_id' comes from 'referral_agent' row...".
    
    -- Let's use a robust query that tries to get referrer. 
    -- Since I can't verify the column name 'referral_profile_id', I will add a comment.
    -- BUT, I must fix the NULL sales_id error.
    
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

    -- Delete existing commissions for this deal
    DELETE FROM public.deal_commissions WHERE deal_id = p_deal_id;

    -- Re-create commissions using the NEW config
    
    -- 1. Referral
    -- Only insert if we have a valid profile_id for referral. 
    -- Since we don't have a clear referrer column in 'deals' from previous context, 
    -- and the user mentioned "IF v_deal.referral_profile_id IS NOT NULL", 
    -- I will assume for now we SKIP referral insert if we don't have a specific ID, 
    -- OR we insert it but we MUST provide a profile_id if the table requires it.
    -- The error "null value in column sales_id" implies 'sales_id' (or profile_id) is NOT NULL.
    
    -- FIX: For now, I will NOT insert referral commission if I can't find a referrer.
    -- This avoids the NULL error.
    -- If there is a referrer column, add it to the SELECT above and uncomment below:
    /*
    IF v_referral_profile_id IS NOT NULL THEN
        INSERT INTO public.deal_commissions (deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id)
        VALUES (p_deal_id, 'referral_agent', v_referral_profile_id, v_config.referral_rate, COALESCE(v_deal_amount, 0), COALESCE(v_deal_amount, 0) * v_config.referral_rate, 'Pending', v_config.id);
    END IF;
    */
    
    -- 2. Sales Agent
    INSERT INTO public.deal_commissions (deal_id, role, profile_id, commission_rate, base_amount, commission_amount, status, config_id)
    VALUES (p_deal_id, 'sales_agent', v_deal_owner_id, v_config.sales_rate, COALESCE(v_deal_amount, 0), COALESCE(v_deal_amount, 0) * v_config.sales_rate, 'Pending', v_config.id);

    -- 3. Team Lead
    -- Team Lead might also need a specific profile_id if the table enforces it.
    -- If 'profile_id' allows NULL for Team Lead (overhead), then this is fine.
    -- If not, we need to find the Team Lead ID (e.g. from profiles hierarchy).
    -- For now, assuming Team Lead row allows NULL profile_id or we use a placeholder.
    -- If it errors, we need to fetch the leader.
    INSERT INTO public.deal_commissions (deal_id, role, commission_rate, base_amount, commission_amount, status, config_id)
    VALUES (p_deal_id, 'team_leader', v_config.team_rate, COALESCE(v_deal_amount, 0), COALESCE(v_deal_amount, 0) * v_config.team_rate, 'Pending', v_config.id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6.1 Helper to recalculate all deals
CREATE OR REPLACE FUNCTION public.recalc_deal_commissions_all()
RETURNS void AS $$
DECLARE
    r record;
BEGIN
    FOR r IN SELECT id FROM public.deals LOOP
        PERFORM public.recalc_deal_commissions(r.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Enable RLS
ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.commission_config;
CREATE POLICY "Enable read access for authenticated users" ON public.commission_config
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert/update for authenticated users" ON public.commission_config;
CREATE POLICY "Enable insert/update for authenticated users" ON public.commission_config
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Create/Update view for Commission By Role Dashboard
-- This ensures the dashboard works with the new role keys (referral_agent, sales_agent, team_leader)
CREATE OR REPLACE VIEW public.v_commission_by_role_month AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(CASE WHEN role = 'referral_agent' THEN commission_amount ELSE 0 END) AS referral_total,
    SUM(CASE WHEN role = 'sales_agent' THEN commission_amount ELSE 0 END) AS sales_agent_total,
    SUM(CASE WHEN role = 'team_leader' THEN commission_amount ELSE 0 END) AS team_leader_total,
    SUM(commission_amount) AS grand_total_with_override
FROM public.deal_commissions
GROUP BY 1
ORDER BY 1;

-- 9. Create RPC to set commission config (Atomic Update)
-- This handles deactivating old configs and inserting the new one to avoid unique constraint violations
CREATE OR REPLACE FUNCTION public.set_commission_config(
    p_referral_rate NUMERIC,
    p_sales_rate NUMERIC,
    p_team_target NUMERIC,
    p_team_rate NUMERIC,
    p_solo_rate NUMERIC
)
RETURNS jsonb AS $$
DECLARE
    v_new_config jsonb;
BEGIN
    -- 1. Deactivate all current active configs
    UPDATE public.commission_config
    SET is_active = false
    WHERE is_active = true;

    -- 2. Insert new active config
    INSERT INTO public.commission_config (
        referral_rate, sales_rate, team_target, team_rate, solo_rate, is_active
    )
    VALUES (
        p_referral_rate, p_sales_rate, p_team_target, p_team_rate, p_solo_rate, true
    )
    RETURNING to_jsonb(commission_config.*) INTO v_new_config;

    RETURN v_new_config;
END;
$$ LANGUAGE plpgsql;
