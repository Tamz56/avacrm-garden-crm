-- 1. Create Payments Table (if not exists)
CREATE TABLE IF NOT EXISTS public.deal_document_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.deal_documents(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL,  -- 'cash', 'transfer', 'check', etc.
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create RPC: Billing / Document dashboard summary
create or replace function public.get_billing_dashboard_summary_v1(
  p_from date,
  p_to   date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  with docs as (
    select
      d.id,
      -- ✅ Adapt: Extract date from payload, fallback to created_at
      COALESCE((d.payload->>'doc_date')::DATE, d.created_at::DATE) as doc_date,
      coalesce(d.doc_type, 'UNKNOWN') as doc_type,
      -- ✅ Adapt: Extract grandTotal from payload totals
      coalesce((d.payload->'totals'->>'grandTotal')::NUMERIC, 0) as doc_total
    from public.deal_documents d
    where 
      COALESCE((d.payload->>'doc_date')::DATE, d.created_at::DATE) between p_from and p_to
      AND d.status != 'cancelled' -- Filter active docs
  ),
  paid as (
    select
      -- ✅ Adapt: document_id from deal_document_payments
      p.document_id as doc_id,
      sum(coalesce(p.amount,0))::numeric as paid_total
    from public.deal_document_payments p
    group by p.document_id
  ),
  joined as (
    select
      d.id,
      d.doc_date,
      d.doc_type,
      d.doc_total,
      coalesce(p.paid_total, 0)::numeric as paid_total,
      greatest(d.doc_total - coalesce(p.paid_total,0), 0)::numeric as outstanding_total
    from docs d
    left join paid p on p.doc_id = d.id
  ),
  totals as (
    select jsonb_build_object(
      'doc_count', count(*),
      'total_amount', coalesce(sum(doc_total),0),
      'paid_amount', coalesce(sum(paid_total),0),
      'outstanding_amount', coalesce(sum(outstanding_total),0)
    ) as j
    from joined
  ),
  by_type as (
    select jsonb_agg(
      jsonb_build_object(
        'doc_type', doc_type,
        'doc_count', doc_count,
        'total_amount', total_amount,
        'paid_amount', paid_amount,
        'outstanding_amount', outstanding_amount
      )
      order by doc_type
    ) as j
    from (
      select
        doc_type,
        count(*) as doc_count,
        coalesce(sum(doc_total),0)::numeric as total_amount,
        coalesce(sum(paid_total),0)::numeric as paid_amount,
        coalesce(sum(outstanding_total),0)::numeric as outstanding_amount
      from joined
      group by doc_type
    ) s
  ),
  daily as (
    select jsonb_agg(
      jsonb_build_object(
        'date', day::text,
        'doc_count', doc_count,
        'total_amount', total_amount,
        'paid_amount', paid_amount,
        'outstanding_amount', outstanding_amount
      )
      order by day
    ) as j
    from (
      select
        doc_date as day,
        count(*) as doc_count,
        coalesce(sum(doc_total),0)::numeric as total_amount,
        coalesce(sum(paid_total),0)::numeric as paid_amount,
        coalesce(sum(outstanding_total),0)::numeric as outstanding_amount
      from joined
      group by doc_date
    ) s
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', p_from::text, 'to', p_to::text),
    'totals', (select j from totals),
    'by_type', coalesce((select j from by_type), '[]'::jsonb),
    'daily', coalesce((select j from daily), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

-- Permissions
grant execute on function public.get_billing_dashboard_summary_v1(date, date) to authenticated;
grant execute on function public.get_billing_dashboard_summary_v1(date, date) to service_role;
