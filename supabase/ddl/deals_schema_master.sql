-- AvaCRM - Deals table DDL (master version)
-- Updated: 2025-11-23
-- Description: Complete schema definition for deals table including all columns and constraints

-- Drop table if exists (use with caution in production)
-- drop table if exists public.deals cascade;

-- Create deals table
create table public.deals (
  id uuid not null default gen_random_uuid(),
  customer_id uuid null,
  deal_code text not null,
  deal_date date null default now(),
  total_amount numeric null,
  tree_total numeric null,
  transport_total numeric null default 0,
  discount numeric null default 0,
  tax_percent numeric null default 7,
  payment_status text null default 'pending'::text,
  deal_status text null default 'pending'::text,
  deposit_amount numeric null default 0,
  remaining_amount numeric null default 0,
  planting_service boolean null default true,
  delivery_responsibility text null default 'customer'::text,
  estimated_digging_days integer null,
  special_note text null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  status public.deal_status_enum not null default 'draft'::deal_status_enum,
  stage public.deal_stage_enum not null default 'inquiry'::deal_stage_enum,
  customer_name text null,
  total_tree_amount numeric(12, 2) null default 0,
  total_transport_amount numeric(12, 2) null default 0,
  total_service_amount numeric(12, 2) null default 0,
  discount_amount numeric(12, 2) null default 0,
  sub_total numeric(12, 2) null default 0,
  vat_amount numeric(12, 2) null default 0,
  grand_total numeric(12, 2) null default 0,
  currency text not null default 'THB'::text,
  expected_delivery_date date null,
  note_internal text null,
  note_customer text null,
  created_by uuid null,
  updated_by uuid null,
  shipping_fee numeric null,

  -- 🔽 3 คอลัมน์ที่หน้า Sales Report ใช้โดยตรง
  title text null,
  amount numeric null,
  closing_date date null,

  -- Primary key
  constraint deals_pkey primary key (id),
  
  -- Unique constraints
  constraint deals_deal_code_key unique (deal_code),
  
  -- Foreign keys
  constraint deals_customer_id_fkey foreign key (customer_id) references customers (id),

  -- Check constraints
  constraint deals_deal_status_check check (
    deal_status = any (array['pending'::text, 'confirmed'::text, 'completed'::text])
  ),

  constraint deals_delivery_responsibility_check check (
    delivery_responsibility = any (array['customer'::text, 'company'::text])
  ),

  constraint deals_payment_status_check check (
    payment_status = any (array['pending'::text, 'deposit'::text, 'paid'::text])
  )
);

-- Create indexes for better query performance
create index if not exists deals_customer_id_idx on public.deals (customer_id);
create index if not exists deals_deal_date_idx on public.deals (deal_date);
create index if not exists deals_stage_idx on public.deals (stage);
create index if not exists deals_status_idx on public.deals (status);
create index if not exists deals_closing_date_idx on public.deals (closing_date);

-- Enable Row Level Security (RLS)
alter table public.deals enable row level security;

-- Create RLS policies (adjust based on your authentication requirements)
-- Example: Allow authenticated users to read all deals
create policy "Allow authenticated users to read deals"
  on public.deals
  for select
  to authenticated
  using (true);

-- Example: Allow authenticated users to insert deals
create policy "Allow authenticated users to insert deals"
  on public.deals
  for insert
  to authenticated
  with check (true);

-- Example: Allow authenticated users to update deals
create policy "Allow authenticated users to update deals"
  on public.deals
  for update
  to authenticated
  using (true)
  with check (true);

-- Example: Allow authenticated users to delete deals
create policy "Allow authenticated users to delete deals"
  on public.deals
  for delete
  to authenticated
  using (true);

-- Add comments for documentation
comment on table public.deals is 'Main deals/orders table for AvaCRM system';
comment on column public.deals.id is 'Unique identifier for the deal';
comment on column public.deals.deal_code is 'Human-readable deal code (e.g., D-2025-001)';
comment on column public.deals.stage is 'Sales stage: inquiry, proposal, negotiation, won, lost';
comment on column public.deals.status is 'Deal status: draft, pending, confirmed, completed';
comment on column public.deals.title is 'Deal title/description (used in Sales Report)';
comment on column public.deals.amount is 'Deal amount (used in Sales Report)';
comment on column public.deals.closing_date is 'Deal closing date (used in Sales Report)';
