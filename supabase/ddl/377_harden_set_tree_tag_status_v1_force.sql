-- 377_harden_set_tree_tag_status_v1_force.sql
-- Harden set_tree_tag_status_v1: force gate via app.allow_force, structured logging, and updated_at

create or replace function public.set_tree_tag_status_v1(
  p_tag_id uuid,
  p_to_status text,
  p_source text default 'ui',
  p_notes text default null,
  p_force boolean default false,
  p_changed_by uuid default null
)
returns public.tree_tags
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_row public.tree_tags;
  v_from text;
  v_allow_force text;
begin
  -- Lock row
  select * into v_row
  from public.tree_tags
  where id = p_tag_id
  for update;

  if v_row.id is null then
    raise exception 'Invalid tag_id: %', p_tag_id;
  end if;

  v_from := v_row.status;

  -- no-op
  if v_from = p_to_status then
    return v_row;
  end if;

  -- FORCE gate: allow only when app.allow_force is set in the current session
  if p_force then
    begin
      v_allow_force := current_setting('app.allow_force', true);
    exception when others then
      v_allow_force := null;
    end;

    if coalesce(v_allow_force,'') <> 'true' then
      raise exception 'FORCE is disabled by app.allow_force (tag_id=%)', p_tag_id;
    end if;
  end if;

  -- Transition rules (only enforced when NOT forcing)
  if not p_force then
    if not (
      -- normal dig flow (ก่อนขุด)
      (v_from = 'in_zone' and p_to_status in ('available','selected_for_dig')) or
      (v_from = 'available' and p_to_status in ('in_zone','selected_for_dig')) or
      (v_from = 'selected_for_dig' and p_to_status = 'root_prune_1') or
      (v_from = 'root_prune_1' and p_to_status = 'root_prune_2') or
      (v_from = 'root_prune_2' and p_to_status = 'root_prune_3') or
      (v_from = 'root_prune_3' and p_to_status = 'root_prune_4') or
      (v_from = 'root_prune_4' and p_to_status = 'ready_to_lift') or
      (v_from = 'ready_to_lift' and p_to_status = 'dug') or

      -- post-dig disposition (สำคัญ)
      (v_from = 'dug' and p_to_status in ('dug_hold','in_stock','shipped','planted','rehab','dead','outside_zone')) or
      (v_from = 'dug_hold' and p_to_status in ('in_stock','shipped','planted','rehab','dead','outside_zone')) or

      -- exceptional target states
      (p_to_status in ('rehab','dead'))
    ) then
      raise exception 'Invalid status transition: % -> % (tag_id=%)', v_from, p_to_status, p_tag_id;
    end if;
  end if;

  -- Write status change log (changed_at is handled by table default; we store actor + source + notes)
  insert into public.tree_tag_status_logs(
    tag_id, from_status, to_status, source, notes, changed_by
  )
  values (
    p_tag_id,
    v_from,
    p_to_status,
    coalesce(p_source,'ui'),
    case when p_force then coalesce(p_notes,'') || ' [FORCE]' else p_notes end,
    p_changed_by
  );

  -- Update tag
  update public.tree_tags
  set status = p_to_status,
      updated_at = now()
  where id = p_tag_id
  returning * into v_row;

  return v_row;
end
$function$;
