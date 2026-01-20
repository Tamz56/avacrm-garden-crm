-- 130_zone_digup_orders_add_source_plan_id.sql
-- Add bidirectional link: zone_digup_orders.source_plan_id -> dig_plans.id
-- + prevent double promote via UNIQUE partial index

begin;

-- 1) add column (nullable for backward compatibility)
alter table public.zone_digup_orders
  add column if not exists source_plan_id uuid;

-- 2) add FK (safe: column is nullable)
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.table_name = 'zone_digup_orders'
      and tc.constraint_type = 'FOREIGN KEY'
      and tc.constraint_name = 'zone_digup_orders_source_plan_id_fkey'
  ) then
    alter table public.zone_digup_orders
      add constraint zone_digup_orders_source_plan_id_fkey
      foreign key (source_plan_id)
      references public.dig_plans(id)
      on delete set null;
  end if;
end $$;

-- 3) index for lookup
create index if not exists idx_zone_digup_orders_source_plan_id
  on public.zone_digup_orders(source_plan_id);

-- 4) hard guard: 1 plan -> 1 order (only when source_plan_id is present)
create unique index if not exists ux_zone_digup_orders_source_plan_id
  on public.zone_digup_orders(source_plan_id)
  where source_plan_id is not null;

commit;
