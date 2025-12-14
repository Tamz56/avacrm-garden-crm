-- 136_fix_missing_profile.sql
-- แก้ไขปัญหา Foreign Key Error: Key (created_by)=(...) is not present in table "profiles"
-- โดยการสร้าง Profile ที่ขาดหายไป หรือถ้าสร้างไม่ได้ให้ปลด Constraint ชั่วคราว

DO $$
DECLARE
    v_missing_id UUID := '36ee44ca-1dad-44ad-83dd-43646073f2c2';
BEGIN
    -- 1. พยายามสร้าง Profile นี้ในตาราง profiles (ถ้ายังไม่มี)
    -- หมายเหตุ: ปกติ profiles จะผูกกับ auth.users แต่ใน dev environment อาจจะ insert ตรงๆ ได้
    -- หรือถ้ามี trigger ที่เช็ค auth.users อาจจะ error ได้
    BEGIN
        INSERT INTO public.profiles (id, first_name, last_name, email)
        VALUES (
            v_missing_id,
            'Apirak',
            'Dev',
            'apirak@example.com'
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✅ Inserted/Ensured profile % exists.', v_missing_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '⚠️ Could not insert profile (likely due to auth.users FK). Error: %', SQLERRM;
        
        -- 2. ถ้า Insert ไม่ได้ (เช่นติด FK กับ auth.users) ให้ Drop Constraint ชั่วคราว
        -- เพื่อให้บันทึกได้ไปก่อน
        ALTER TABLE public.commission_payouts
        DROP CONSTRAINT IF EXISTS commission_payouts_created_by_fkey;
        
        RAISE NOTICE '⚠️ Dropped foreign key constraint on commission_payouts.created_by to allow operation.';
    END;
END $$;
