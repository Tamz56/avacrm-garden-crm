-- ============================================================
-- 099_create_commission_report_views.sql
-- สร้าง Views สำหรับรายงานค่าคอมมิชชั่นเดือนปัจจุบัน
-- ============================================================

-- 1. View: รายละเอียดค่าคอมมิชชั่นรายดีล (เดือนปัจจุบัน)
CREATE OR REPLACE VIEW public.commission_detail_current_month_view AS
SELECT 
    dc.id AS commission_id,
    dc.profile_id,
    dc.role,
    dc.base_amount,
    dc.commission_rate,
    dc.commission_amount,
    dc.status AS commission_status,
    d.id AS deal_id,
    d.deal_code,
    d.title AS deal_title,
    d.closing_date,
    d.payment_status AS deal_payment_status
FROM 
    public.deal_commissions dc
JOIN 
    public.deals d ON dc.deal_id = d.id
WHERE 
    -- เลือกเฉพาะดีลที่ปิดในเดือนปัจจุบัน (ดูจาก closing_date)
    -- หรือถ้า closing_date เป็น null ให้ดู created_at แทน (เผื่อกรณีข้อมูลเก่า)
    DATE_TRUNC('month', COALESCE(d.closing_date::date, d.created_at)) = DATE_TRUNC('month', CURRENT_DATE);

-- 2. View: สรุปภาพรวมค่าคอมมิชชั่น (เดือนปัจจุบัน)
CREATE OR REPLACE VIEW public.commission_summary_current_month_view AS
SELECT 
    dc.profile_id,
    COUNT(DISTINCT dc.deal_id) AS total_deals,
    COALESCE(SUM(dc.commission_amount), 0) AS total_commission,
    COALESCE(SUM(CASE WHEN dc.status = 'Paid' THEN dc.commission_amount ELSE 0 END), 0) AS paid_commission,
    COALESCE(SUM(CASE WHEN dc.status != 'Paid' OR dc.status IS NULL THEN dc.commission_amount ELSE 0 END), 0) AS pending_commission
FROM 
    public.deal_commissions dc
JOIN 
    public.deals d ON dc.deal_id = d.id
WHERE 
    DATE_TRUNC('month', COALESCE(d.closing_date::date, d.created_at)) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY 
    dc.profile_id;

-- Grant permissions
GRANT SELECT ON public.commission_detail_current_month_view TO authenticated;
GRANT SELECT ON public.commission_summary_current_month_view TO authenticated;

-- Comment
COMMENT ON VIEW public.commission_detail_current_month_view IS 'รายละเอียดค่าคอมมิชชั่นของเดือนปัจจุบัน';
COMMENT ON VIEW public.commission_summary_current_month_view IS 'สรุปยอดค่าคอมมิชชั่นรายบุคคลของเดือนปัจจุบัน';
