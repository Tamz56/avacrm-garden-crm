-- 132_verify_commission_data.sql
-- สคริปต์สำหรับตรวจสอบข้อมูลค่าคอมมิชชั่น (Auto-verify)
-- 1. ค้นหาดีลล่าสุดที่ปิดการขายและจ่ายเงินแล้ว
-- 2. สั่งคำนวณค่าคอมมิชชั่นใหม่ (recalc)
-- 3. แสดงผลลัพธ์ในตาราง deal_commissions

-- ============================================================
-- 1. Recalculate Commission for Latest Paid Deal
-- ============================================================
DO $$
DECLARE
    v_latest_deal_id UUID;
BEGIN
    -- หาดีลล่าสุดที่ stage='won' และ payment_status='paid'
    SELECT id INTO v_latest_deal_id
    FROM public.deals
    WHERE stage = 'won'
      AND payment_status = 'paid'
    ORDER BY COALESCE(paid_at, created_at) DESC
    LIMIT 1;

    IF v_latest_deal_id IS NOT NULL THEN
        -- เรียก RPC คำนวณค่าคอมฯ
        PERFORM public.recalc_deal_commissions(v_latest_deal_id);
        RAISE NOTICE 'Recalculated commissions for deal: %', v_latest_deal_id;
    ELSE
        RAISE NOTICE 'No paid deal found to recalculate.';
    END IF;
END $$;

-- ============================================================
-- 2. Show Result in deal_commissions
-- ============================================================
WITH latest_deal AS (
    SELECT id, title, grand_total
    FROM public.deals
    WHERE stage = 'won'
      AND payment_status = 'paid'
    ORDER BY COALESCE(paid_at, created_at) DESC
    LIMIT 1
)
SELECT 
    dc.created_at,
    d.title AS deal_title,
    dc.role,
    dc.commission_amount,
    dc.profile_id,
    p.full_name AS profile_name,
    dc.status
FROM public.deal_commissions dc
JOIN latest_deal d ON d.id = dc.deal_id
LEFT JOIN public.profiles p ON p.id = dc.profile_id
WHERE dc.deal_id = (SELECT id FROM latest_deal)
ORDER BY dc.created_at DESC;
