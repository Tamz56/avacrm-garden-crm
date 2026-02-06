-- 407_document_snapshot_guard.sql
-- Ensure payload snapshot structure is complete for immutable documents

-- 1) Ensure payload snapshot column exists (should exist from earlier migration)
alter table public.deal_documents
  add column if not exists payload jsonb;

-- 2) Optional: versioning for contract stability
alter table public.deal_documents
  add column if not exists payload_version int not null default 1;

-- 3) Optional: checksum for audit (app-side sha256)
alter table public.deal_documents
  add column if not exists payload_checksum text;

-- 4) Index for efficient deal document lookups
create index if not exists idx_deal_documents_deal_id_created_at
  on public.deal_documents(deal_id, created_at desc);

-- 5) Partial index for non-voided documents
create index if not exists idx_deal_documents_deal_id_active
  on public.deal_documents(deal_id)
  where status != 'voided';

comment on column public.deal_documents.payload is 'Immutable JSON snapshot of document content at creation time';
comment on column public.deal_documents.payload_version is 'Schema version of payload structure (for future migrations)';
comment on column public.deal_documents.payload_checksum is 'SHA-256 hash of payload JSON for audit/integrity verification';
