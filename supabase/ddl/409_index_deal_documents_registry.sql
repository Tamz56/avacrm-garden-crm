-- 409_index_deal_documents_registry.sql
-- Indexes: ทำให้ค้น/กรองเร็ว สำหรับ Billing Console
-- ============================================================

-- Enable trigram extension for fuzzy search
create extension if not exists pg_trgm;

-- Composite indexes for common queries
create index if not exists idx_deal_documents_deal_id_created_at
  on public.deal_documents (deal_id, created_at desc);

create index if not exists idx_deal_documents_doc_type_created_at
  on public.deal_documents (doc_type, created_at desc);

create index if not exists idx_deal_documents_status_created_at
  on public.deal_documents (status, created_at desc);

-- Trigram index for fast LIKE/ILIKE search on doc_no
create index if not exists idx_deal_documents_doc_no_trgm
  on public.deal_documents using gin (doc_no gin_trgm_ops);

-- Trigram index for customer_name search (from payload)
create index if not exists idx_deal_documents_customer_name_trgm
  on public.deal_documents using gin ((payload->'customer'->>'name') gin_trgm_ops);
