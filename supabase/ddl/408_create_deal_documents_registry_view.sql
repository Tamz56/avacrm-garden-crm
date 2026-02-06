-- 408_create_deal_documents_registry_view.sql
-- Registry View: แตกข้อมูลสำคัญออกจาก payload สำหรับ Billing Console (Production-Ready)
-- ============================================================
-- ✅ doc_date: ใช้ payload.doc_date หรือ fallback เป็น created_at::date
-- ✅ status normalization: map 'voided' → ยังคงแยกจาก 'cancelled' ได้

drop view if exists public.view_deal_documents_registry cascade;

create or replace view public.view_deal_documents_registry as
select
  dd.id,
  dd.deal_id,
  dd.doc_type,
  dd.doc_no,
  dd.status,
  dd.created_at,
  dd.voided_at,

  -- doc_date: from payload with fallback to created_at
  coalesce(
    (dd.payload->>'doc_date')::date,
    dd.created_at::date
  ) as doc_date,

  -- customer info from payload
  dd.payload#>>'{customer,name}'   as customer_name,
  dd.payload#>>'{customer,phone}'  as customer_phone,

  -- totals from payload.totals
  coalesce((dd.payload#>>'{totals,subTotal}')::numeric, 0)     as sub_total,
  coalesce((dd.payload#>>'{totals,vatBase}')::numeric, 0)      as vat_base,
  coalesce((dd.payload#>>'{totals,vatRate}')::numeric, 7)      as vat_rate,
  coalesce((dd.payload#>>'{totals,vatAmount}')::numeric, 0)    as vat_amount,
  coalesce((dd.payload#>>'{totals,grandTotal}')::numeric, 0)   as grand_total,
  coalesce(dd.payload#>>'{totals,bahtText}', '')               as baht_text,

  -- misc
  dd.pdf_url,
  dd.created_by,
  dd.voided_by,
  dd.void_reason,
  
  -- payload for preview (optional, can remove if too heavy)
  dd.payload

from public.deal_documents dd;

-- Grant access
grant select on public.view_deal_documents_registry to authenticated;

comment on view public.view_deal_documents_registry is 'Registry view extracting key fields from payload for Billing Console';
