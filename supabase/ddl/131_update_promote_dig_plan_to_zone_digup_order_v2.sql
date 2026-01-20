-- 131_update_promote_dig_plan_to_zone_digup_order_v2.sql
-- Promote dig_plan -> zone_digup_order, set source_plan_id,
-- create items, update promoted fields on dig_plans, idempotent.

create or replace function public.promote_dig_plan_to_zone_digup_order_v2(
  p_plan_id uuid,
  p_digup_date date,
  p_status text default 'planned',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zone_id uuid;
  v_qty int;
  v_order_id uuid;
  v_existing_order_id uuid;
  v_plan_created_by uuid;
  v_actor uuid;
begin
  -- Validate plan exists and get zone_id + qty
  select dp.zone_id,
         dp.qty,
         dp.created_by,
         dp.promoted_order_id
    into v_zone_id, v_qty, v_plan_created_by, v_existing_order_id
  from public.dig_plans dp
  where dp.id = p_plan_id;

  if v_zone_id is null then
    raise exception 'Invalid p_plan_id: %', p_plan_id;
  end if;

  -- Idempotent: if already promoted, return existing order id
  if v_existing_order_id is not null then
    return v_existing_order_id;
  end if;

  -- Actor for audit
  -- If called from UI with user session -> auth.uid() not null
  -- Otherwise fallback to plan.created_by (if any)
  v_actor := coalesce(auth.uid(), v_plan_created_by);

  -- Create order (with backward compatible columns)
  insert into public.zone_digup_orders (
    zone_id,
    digup_date,
    qty,
    status,
    notes,
    created_at,
    updated_at,
    created_by,
    source_plan_id
  )
  values (
    v_zone_id,
    p_digup_date,
    coalesce(v_qty, 0),
    coalesce(p_status, 'planned'),
    p_notes,
    now(),
    now(),
    coalesce(v_actor, auth.uid()),
    p_plan_id
  )
  returning id into v_order_id;

  -- Copy active items from plan -> order_items
  -- created_by must not be null (your table has NOT NULL)
  insert into public.zone_digup_order_items (
    zone_digup_order_id,
    tag_id,
    qty,
    notes,
    created_at,
    created_by
  )
  select
    v_order_id,
    i.tag_id,
    i.qty,
    i.notes,
    now(),
    coalesce(auth.uid(), i.created_by, v_plan_created_by)
  from public.dig_plan_items i
  where i.plan_id = p_plan_id
    and i.is_active = true;

  -- Mark plan as promoted (link + audit)
  update public.dig_plans
  set promoted_order_id = v_order_id,
      promoted_at       = now(),
      promoted_by       = v_actor,
      updated_at        = now()
  where id = p_plan_id;

  return v_order_id;
end;
$$;

grant execute on function public.promote_dig_plan_to_zone_digup_order_v2(uuid, date, text, text) to authenticated;
