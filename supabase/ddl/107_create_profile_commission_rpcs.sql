-- 107_create_profile_commission_rpcs.sql
-- สร้าง RPC สำหรับดึงข้อมูลค่าคอมมิชชั่นของโปรไฟล์ตามเดือน

-- ============================================================
-- 1. RPC สรุปค่าคอมฯ รายเดือน "ภาพรวมทั้งเดือน"
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_profile_monthly_commission_summary(
    p_profile_id  UUID,
    p_month_start DATE,
    p_month_end   DATE
)
RETURNS TABLE (
    profile_id           UUID,
    total_commission_paid NUMERIC(14,2),
    deal_count           INTEGER,
    payout_count         INTEGER,
    first_payout_date    DATE,
    last_payout_date     DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT
        dc.profile_id,
        COALESCE(SUM(cp.amount), 0)                      AS total_commission_paid,
        COUNT(DISTINCT dc.deal_id)                       AS deal_count,
        COUNT(cp.id)                                     AS payout_count,
        MIN(cp.pay_date)                                 AS first_payout_date,
        MAX(cp.pay_date)                                 AS last_payout_date
    FROM public.deal_commissions dc
    JOIN public.commission_payouts cp
      ON cp.deal_commission_id = dc.id
    WHERE dc.profile_id = p_profile_id
      AND cp.pay_date >= p_month_start
      AND cp.pay_date <  p_month_end
    GROUP BY dc.profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_monthly_commission_summary(
  UUID, DATE, DATE
) TO anon, authenticated, service_role;

-- ============================================================
-- 2. RPC "รายละเอียดต่อดีล" ของคน ๆ นั้น ในเดือนนั้น
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_profile_monthly_commission_details(
    p_profile_id  UUID,
    p_month_start DATE,
    p_month_end   DATE
)
RETURNS TABLE (
    deal_commission_id UUID,
    deal_id            UUID,
    deal_title         TEXT,
    role               TEXT,
    deal_amount        NUMERIC(12,2),
    commission_amount  NUMERIC(12,2),
    paid_in_month      NUMERIC(12,2),
    total_paid         NUMERIC(12,2),
    remaining_amount   NUMERIC(12,2),
    last_pay_date      DATE,
    status             TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    WITH payouts_in_month AS (
        SELECT
            cp.deal_commission_id,
            SUM(cp.amount)    AS paid_in_month,
            MAX(cp.pay_date)  AS last_pay_date
        FROM public.commission_payouts cp
        JOIN public.deal_commissions dc
          ON dc.id = cp.deal_commission_id
        WHERE dc.profile_id = p_profile_id
          AND cp.pay_date >= p_month_start
          AND cp.pay_date <  p_month_end
        GROUP BY cp.deal_commission_id
    )
    SELECT
        dc.id                     AS deal_commission_id,
        dc.deal_id,
        d.title                   AS deal_title,
        dc.role,
        d.grand_total             AS deal_amount,
        dc.commission_amount,
        COALESCE(pim.paid_in_month, 0) AS paid_in_month,
        dc.paid_amount            AS total_paid,
        (dc.commission_amount - dc.paid_amount) AS remaining_amount,
        pim.last_pay_date,
        dc.status
    FROM public.deal_commissions dc
    JOIN public.deals d
      ON d.id = dc.deal_id
    LEFT JOIN payouts_in_month pim
      ON pim.deal_commission_id = dc.id
    WHERE dc.profile_id = p_profile_id
      AND (pim.paid_in_month IS NOT NULL)
    ORDER BY pim.last_pay_date DESC, d.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_monthly_commission_details(
  UUID, DATE, DATE
) TO anon, authenticated, service_role;

-- ⚡ บังคับ Reload Schema Cache ⚡
NOTIFY pgrst, 'reload schema';
