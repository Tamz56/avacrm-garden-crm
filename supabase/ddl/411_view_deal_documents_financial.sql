-- 411_view_deal_documents_financial.sql
-- Financial View: สรุปยอดรับเงิน + คงเหลือ สำหรับ Billing Console (Production-Ready)
-- ============================================================
-- ✅ กัน SUM ซ้ำ: ทำ aggregate ใน subquery ก่อน join
-- ✅ กัน void/cancelled: payment_state = 'n/a' ถ้า status ไม่ใช่ issued
-- ✅ กัน QT: QT ไม่ต้องรับเงิน = payment_state = 'n/a'
-- ✅ doc_date fallback: ใช้ payload.doc_date หรือ fallback เป็น created_at

drop view if exists public.view_deal_documents_financial;

create or replace view public.view_deal_documents_financial as
with payment_sums as (
  -- Pre-aggregate payments per document to avoid SUM duplication in join
  select 
    document_id,
    sum(amount)::numeric(12,2) as paid_total
  from public.deal_document_payments
  group by document_id
)
select
  r.*,
  coalesce(p.paid_total, 0) as paid_total,
  -- Balance: ถ้า cancelled/voided ให้ balance = 0
  case
    when r.status in ('cancelled', 'voided') then 0
    else greatest(coalesce(r.grand_total, 0) - coalesce(p.paid_total, 0), 0)
  end as balance,
  -- Payment State Logic
  case
    when r.doc_type = 'QT' then 'n/a'::text
    when r.status in ('cancelled', 'voided') then 'n/a'::text
    when coalesce(r.grand_total, 0) = 0 then 'n/a'::text
    when coalesce(p.paid_total, 0) <= 0 then 'unpaid'::text
    when coalesce(p.paid_total, 0) >= coalesce(r.grand_total, 0) then 'paid'::text
    else 'partial'::text
  end as payment_state
from public.view_deal_documents_registry r
left join payment_sums p on p.document_id = r.id;

-- Grant access
grant select on public.view_deal_documents_financial to authenticated;

comment on view public.view_deal_documents_financial is 'Financial summary view for Billing Console with payment tracking';
