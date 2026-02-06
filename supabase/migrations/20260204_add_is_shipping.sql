alter table public.deal_document_items
  add column if not exists is_shipping boolean not null default false;

comment on column deal_document_items.is_shipping is 'Flag for shipping fee items';
