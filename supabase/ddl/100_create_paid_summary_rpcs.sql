-- ============================================================
-- 100_create_paid_summary_rpcs.sql
-- สร้าง RPC Functions สำหรับ Dashboard ยอดรับชำระ
-- ============================================================

-- 1. RPC: สรุปยอดรวมรายเดือน
CREATE OR REPLACE FUNCTION public.get_paid_deals_summary_for_month(
    p_year INT,
    p_month INT
)
RETURNS TABLE (
    year INT,
    month INT,
    total_revenue NUMERIC,
    total_deals BIGINT,
    total_customers BIGINT,
    avg_deal_amount NUMERIC,
    first_paid_at TIMESTAMPTZ,
    last_paid_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_year AS year,
        p_month AS month,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(id) AS total_deals,
        -- ถ้าไม่มี customer_id ให้ใช้วิธีนับ customer_name หรืออื่นๆ แทน
        -- ในที่นี้สมมติว่านับจากชื่อลูกค้าไปก่อน ถ้ายังไม่มี customer_id ชัดเจน
        COUNT(DISTINCT customer_name) AS total_customers,
        COALESCE(AVG(total_amount), 0) AS avg_deal_amount,
        MIN(paid_at) AS first_paid_at,
        MAX(paid_at) AS last_paid_at
    FROM 
        public.deals
    WHERE 
        payment_status = 'paid'
        AND EXTRACT(YEAR FROM paid_at) = p_year
        AND EXTRACT(MONTH FROM paid_at) = p_month;
END;
$$;

-- 2. RPC: สรุปยอดรายวันในเดือนนั้น (สำหรับกราฟ)
CREATE OR REPLACE FUNCTION public.get_paid_deals_daily_for_month(
    p_year INT,
    p_month INT
)
RETURNS TABLE (
    day TEXT, -- ส่งกลับเป็น String ISO Date
    total_revenue NUMERIC,
    total_deals BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE(paid_at), 'YYYY-MM-DD') AS day,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(id) AS total_deals
    FROM 
        public.deals
    WHERE 
        payment_status = 'paid'
        AND EXTRACT(YEAR FROM paid_at) = p_year
        AND EXTRACT(MONTH FROM paid_at) = p_month
    GROUP BY 
        DATE(paid_at)
    ORDER BY 
        DATE(paid_at);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_paid_deals_summary_for_month TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paid_deals_daily_for_month TO authenticated;

-- Comment
COMMENT ON FUNCTION public.get_paid_deals_summary_for_month IS 'ดึงข้อมูลสรุปยอดขายที่ชำระเงินแล้วประจำเดือน';
COMMENT ON FUNCTION public.get_paid_deals_daily_for_month IS 'ดึงข้อมูลยอดขายรายวันสำหรับกราฟ';
