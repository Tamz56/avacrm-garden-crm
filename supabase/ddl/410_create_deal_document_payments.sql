-- 410_create_deal_document_payments.sql
-- Payment Tracking: ตารางรับชำระเงินต่อเอกสาร (Production-Ready)
-- ============================================================

create table if not exists public.deal_document_payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.deal_documents(id) on delete cascade,
  paid_at timestamptz not null default now(),
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'transfer', -- transfer | cash | check | other
  reference_no text,  -- ✅ เลขอ้างอิง slip / เช็ค / etc.
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Indexes for fast lookup
create index if not exists idx_doc_payments_document_id
  on public.deal_document_payments (document_id);

create index if not exists idx_doc_payments_paid_at
  on public.deal_document_payments (paid_at desc);

create index if not exists idx_doc_payments_document_paid
  on public.deal_document_payments (document_id, paid_at desc);

-- RLS Policies
alter table public.deal_document_payments enable row level security;

-- Drop existing policies if any (idempotent)
drop policy if exists "Allow authenticated to read payments" on public.deal_document_payments;
drop policy if exists "Allow authenticated to insert payments" on public.deal_document_payments;
drop policy if exists "Allow authenticated to delete own payments" on public.deal_document_payments;

create policy "Allow authenticated to read payments"
on public.deal_document_payments
for select to authenticated
using (true);

create policy "Allow authenticated to insert payments"
on public.deal_document_payments
for insert to authenticated
with check (true);

-- Only allow delete if you created it (or admin via RPC)
create policy "Allow authenticated to delete own payments"
on public.deal_document_payments
for delete to authenticated
using (created_by = auth.uid());

-- Grant access
grant select, insert, delete on public.deal_document_payments to authenticated;

comment on table public.deal_document_payments is 'Payment records for deal documents (INV/DEP/RCPT)';
comment on column public.deal_document_payments.reference_no is 'External reference: slip number, check number, etc.';
