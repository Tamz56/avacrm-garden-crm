-- 129_create_dig_plan_v1.sql
-- RPC: create dig plan (minimal)

create or replace function public.create_dig_plan_v1(
  p_zone_id uuid,
  p_status text default 'planned',
  p_confidence_level text default 'medium',
  p_plan_reason text default null,
  p_notes text default null,
  p_target_date_from date default null,
  p_target_date_to date default null
)
returns table(ok boolean, message text, plan_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_actor uuid;
  v_status text;
  v_conf text;
begin
  v_actor := auth.uid();
  v_status := lower(coalesce(p_status, 'planned'));
  v_conf := lower(coalesce(p_confidence_level, 'medium'));

  if p_zone_id is null then
    return query select false, 'zone_id is required', null::uuid;
    return;
  end if;

  if v_status not in ('planned','in_progress','completed','cancelled') then
    return query select false, 'Invalid status (planned, in_progress, completed, cancelled)', null::uuid;
    return;
  end if;

  if v_conf not in ('low','medium','high') then
    return query select false, 'Invalid confidence_level (low, medium, high)', null::uuid;
    return;
  end if;

  if p_target_date_from is not null and p_target_date_to is not null and p_target_date_to < p_target_date_from then
    return query select false, 'target_date_to must be >= target_date_from', null::uuid;
    return;
  end if;

  insert into public.dig_plans (
    zone_id,
    status,
    confidence_level,
    plan_reason,
    notes,
    target_date_from,
    target_date_to,
    created_at,
    updated_at,
    created_by
  )
  values (
    p_zone_id,
    v_status,
    v_conf,
    nullif(btrim(p_plan_reason), ''),
    nullif(btrim(p_notes), ''),
    p_target_date_from,
    p_target_date_to,
    now(),
    now(),
    v_actor
  )
  returning id into v_plan_id;

  return query select true, 'created', v_plan_id;
  return;

exception when undefined_column then
  -- if dig_plans doesn't have created_by
  insert into public.dig_plans (
    zone_id,
    status,
    confidence_level,
    plan_reason,
    notes,
    target_date_from,
    target_date_to,
    created_at,
    updated_at
  )
  values (
    p_zone_id,
    v_status,
    v_conf,
    nullif(btrim(p_plan_reason), ''),
    nullif(btrim(p_notes), ''),
    p_target_date_from,
    p_target_date_to,
    now(),
    now()
  )
  returning id into v_plan_id;

  return query select true, 'created', v_plan_id;
  return;
end;
$$;

grant execute on function public.create_dig_plan_v1(uuid,text,text,text,text,date,date) to authenticated;
