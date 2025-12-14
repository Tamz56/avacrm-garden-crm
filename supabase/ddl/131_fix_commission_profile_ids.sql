-- 131_fix_commission_profile_ids.sql
-- อัปเดต profile_id ใน deal_commissions จากตาราง deals

-- 1) เติม profile_id ให้แถว role = 'sales_agent' (ใช้ closing_sales_id)
UPDATE public.deal_commissions dc
SET profile_id = d.closing_sales_id
FROM public.deals d
WHERE dc.deal_id = d.id
  AND dc.role = 'sales_agent'
  AND dc.profile_id IS NULL
  AND d.closing_sales_id IS NOT NULL;

-- 2) เติม profile_id ให้แถว role = 'referral' (ใช้ referral_sales_id)
UPDATE public.deal_commissions dc
SET profile_id = d.referral_sales_id
FROM public.deals d
WHERE dc.deal_id = d.id
  AND dc.role = 'referral'
  AND dc.profile_id IS NULL
  AND d.referral_sales_id IS NOT NULL;

-- 3) เติม profile_id ให้แถว role = 'team_leader' (ใช้ team_leader_id)
UPDATE public.deal_commissions dc
SET profile_id = d.team_leader_id
FROM public.deals d
WHERE dc.deal_id = d.id
  AND dc.role = 'team_leader'
  AND dc.profile_id IS NULL
  AND d.team_leader_id IS NOT NULL;

-- 4) เช็กผลลัพธ์ (ควรจะไม่เหลือ NULL หรือเหลือน้อยมาก)
SELECT id, deal_id, role, commission_amount, profile_id, created_at
FROM public.deal_commissions
WHERE profile_id IS NULL
ORDER BY created_at DESC;
