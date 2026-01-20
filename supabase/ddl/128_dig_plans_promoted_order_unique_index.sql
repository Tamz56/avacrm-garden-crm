-- 128_dig_plans_promoted_order_unique_index.sql
-- Ensure each order can only be linked to one plan

create unique index if not exists dig_plans_promoted_order_id_unique
on public.dig_plans (promoted_order_id)
where promoted_order_id is not null;
