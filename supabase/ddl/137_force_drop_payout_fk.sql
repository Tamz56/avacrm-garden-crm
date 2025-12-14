-- 137_force_drop_payout_fk.sql
-- บังคับลบ Foreign Key Constraint ของ commission_payouts.created_by
-- เพื่อแก้ปัญหา Error: Key (created_by)=(...) is not present in table "profiles"

DO $$
BEGIN
    -- ลบ Constraint ทิ้งเลย (ไม่ต้องเช็คเงื่อนไขเยอะ)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'commission_payouts_created_by_fkey'
        AND table_name = 'commission_payouts'
    ) THEN
        ALTER TABLE public.commission_payouts
        DROP CONSTRAINT commission_payouts_created_by_fkey;
        
        RAISE NOTICE '✅ Dropped constraint commission_payouts_created_by_fkey';
    ELSE
        RAISE NOTICE 'ℹ️ Constraint commission_payouts_created_by_fkey does not exist (already dropped?)';
    END IF;
END $$;
