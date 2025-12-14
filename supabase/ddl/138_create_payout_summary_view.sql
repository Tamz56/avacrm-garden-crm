-- 138_create_payout_summary_view.sql
-- สร้าง View สำหรับหน้า "สรุปค่าคอมมิชชั่นสำหรับจ่าย"
-- Group by Month (deal created_at) และ Profile

CREATE OR REPLACE VIEW public.v_commission_payout_summary_month AS
SELECT
    -- ใช้วันที่ 1 ของเดือนที่เกิดดีล เป็นตัวแทนเดือน
    date_trunc('month', d.created_at)::date AS month,
    
    dc.profile_id,
    COALESCE(p.full_name, p.display_name, 'Unknown') AS profile_name,
    
    -- ยอดคอมฯ ที่ต้องจ่าย (Due) สำหรับดีลในเดือนนี้
    SUM(dc.commission_amount) AS due_in_month,
    
    -- ยอดที่จ่ายไปแล้ว (Paid) สำหรับดีลในเดือนนี้
    SUM(dc.paid_amount) AS paid_in_month,
    
    -- ยอดคงเหลือ (Remaining)
    SUM(dc.commission_amount - dc.paid_amount) AS remaining_in_month

FROM public.deal_commissions dc
JOIN public.deals d ON d.id = dc.deal_id
LEFT JOIN public.profiles p ON p.id = dc.profile_id

-- กรองเฉพาะดีลที่ปิดการขายแล้ว (won) หรือสถานะอื่นๆ ตามต้องการ
WHERE d.stage = 'won'

GROUP BY 1, 2, 3;

-- Grant permissions
GRANT SELECT ON public.v_commission_payout_summary_month TO anon, authenticated, service_role;
