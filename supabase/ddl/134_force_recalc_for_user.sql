-- 134_force_recalc_for_user.sql
-- สคริปต์นี้จะบังคับคำนวณค่าคอมฯ ให้กับดีลที่เป็นของ User: Apirak (36ee44ca-1dad-44ad-83dd-43646073f2c2)
-- เพื่อให้มั่นใจว่าจะมีข้อมูลขึ้นในรายงานแน่นอน

DO $$
DECLARE
    v_target_profile_id UUID := '36ee44ca-1dad-44ad-83dd-43646073f2c2'; -- Apirak
    v_deal_id UUID;
    v_count INT;
BEGIN
    -- 1. หาดีลล่าสุดที่ User คนนี้มีส่วนเกี่ยวข้อง (เป็น Sales, Referral หรือ Leader)
    SELECT id INTO v_deal_id
    FROM public.deals
    WHERE (closing_sales_id = v_target_profile_id 
           OR referral_sales_id = v_target_profile_id 
           OR team_leader_id = v_target_profile_id)
      AND stage = 'won' -- เอาเฉพาะดีลที่ปิดแล้ว
    ORDER BY created_at DESC
    LIMIT 1;

    -- 2. ถ้าเจอดีล ให้สั่งคำนวณใหม่
    IF v_deal_id IS NOT NULL THEN
        PERFORM public.recalc_deal_commissions(v_deal_id);
        RAISE NOTICE '✅ Recalculated commission for Deal ID: % (User involved)', v_deal_id;
    ELSE
        RAISE NOTICE '⚠️ ไม่พบดีลที่ User นี้ (36ee44ca...) มีส่วนเกี่ยวข้องเลย';
        RAISE NOTICE 'แนะนำให้ลองไปแก้ไขดีลสักอัน แล้วเลือก User นี้เป็น Sales Agent ดูครับ';
    END IF;

END $$;

-- 3. แสดงผลลัพธ์ในตาราง deal_commissions ของ User นี้
SELECT 
    dc.created_at,
    d.title AS deal_title,
    dc.role,
    dc.commission_amount,
    dc.profile_id,
    dc.status
FROM public.deal_commissions dc
JOIN public.deals d ON d.id = dc.deal_id
WHERE dc.profile_id = '36ee44ca-1dad-44ad-83dd-43646073f2c2'
ORDER BY dc.created_at DESC
LIMIT 5;
