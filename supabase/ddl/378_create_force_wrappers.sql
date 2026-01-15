-- 378_create_force_wrappers.sql
-- RPC wrappers for FORCE operations (UI-safe): enable app.allow_force per call
-- Restrict FORCE to admin (hardcoded allowlist for now)

create or replace function public.force_set_tree_tag_status_v1(
  p_tag_id uuid,
  p_to_status text,
  p_source text default 'ui',
  p_notes text default null
)
returns public.tree_tags
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();

  -- Require authenticated user
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Admin allowlist (คุณตั้ม: admin@avafarm888.com)
  if v_uid <> '36ee44ca-1dad-44a4-83dd-43646073f2c2'::uuid then
    raise exception 'Forbidden: FORCE requires admin';
  end if;

  -- Require reason
  if coalesce(trim(p_notes), '') = '' then
    raise exception 'FORCE requires notes (reason)';
  end if;

  -- Enable force only for this function call/session scope
  set local app.allow_force = 'true';

  return public.set_tree_tag_status_v1(
    p_tag_id,
    p_to_status,
    coalesce(p_source,'ui'),
    p_notes,
    true,
    v_uid
  );
end;
$$;

create or replace function public.force_apply_digup_disposition_v1(
  p_zone_digup_order_id uuid,
  p_disposition text,
  p_notes text default null,
  p_source text default 'ui'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_uid <> '36ee44ca-1dad-44a4-83dd-43646073f2c2'::uuid then
    raise exception 'Forbidden: FORCE requires admin';
  end if;

  if coalesce(trim(p_notes), '') = '' then
    raise exception 'FORCE requires notes (reason)';
  end if;

  set local app.allow_force = 'true';

  perform public.apply_digup_disposition_v1(
    p_zone_digup_order_id,
    p_disposition,
    p_notes,
    coalesce(p_source,'ui'),
    true,
    v_uid
  );
end;
$$;
