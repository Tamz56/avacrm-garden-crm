-- 1) Ensure all enum values exist
DO $$ 
BEGIN
    ALTER TYPE public.doc_type_enum ADD VALUE IF NOT EXISTS 'QT';
    ALTER TYPE public.doc_type_enum ADD VALUE IF NOT EXISTS 'INV';
    ALTER TYPE public.doc_type_enum ADD VALUE IF NOT EXISTS 'DEP';
    ALTER TYPE public.doc_type_enum ADD VALUE IF NOT EXISTS 'RCPT';
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2) deal_documents: add vat_enabled (default true)
alter table public.deal_documents
  add column if not exists vat_enabled boolean not null default true;

-- 2) ensure void audit fields exist (safe if already created in 405)
alter table public.deal_documents
  add column if not exists voided_at timestamptz;

alter table public.deal_documents
  add column if not exists voided_by uuid;

alter table public.deal_documents
  add column if not exists void_reason text;

-- 3) optional: index for common filtering
create index if not exists idx_deal_documents_status
  on public.deal_documents(status);

create index if not exists idx_deal_documents_created_at
  on public.deal_documents(created_at desc);
