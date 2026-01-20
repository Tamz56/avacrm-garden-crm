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
set search_path = public
as $function$
declare
  v_row public.tree_tags;
  v_from text;
begin
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

  ---------------------------------------------------------------------------
  -- FORCE hardening (production safety)
  -- Goal:
  -- 1) FORCE must always have an actor (p_changed_by)
  -- 2) FORCE is allowed only from specific sources
  -- 3) FORCE requires an explicit session flag: set local app.allow_force='true';
  ---------------------------------------------------------------------------
  if p_force then
    -- must record actor
    if p_changed_by is null then
      raise exception 'FORCE requires p_changed_by (tag_id=%)', p_tag_id;
    end if;

    -- limit allowed sources for FORCE (adjust list if you need)
    if coalesce(p_source,'') not in ('manual_sql','admin') then
      raise exception 'FORCE not allowed for source=% (tag_id=%)', p_source, p_tag_id;
    end if;

    -- require explicit session flag (default is disabled)
    -- usage before calling:
    --   set local app.allow_force = 'true';
    if coalesce(current_setting('app.allow_force', true), 'false') <> 'true' then
      raise exception 'FORCE is disabled by app.allow_force (tag_id=%)', p_tag_id;
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- Normal transition validation
  ---------------------------------------------------------------------------
  if not p_force then
    if not (
      -- =========================================================
      -- PRE-DIG (in zone / available / planned / selected)
      -- =========================================================
      (v_from = 'in_zone' and p_to_status in ('available','planned_for_dig','selected_for_dig')) or
      (v_from = 'available' and p_to_status in ('in_zone','planned_for_dig','selected_for_dig')) or
      (v_from = 'planned_for_dig' and p_to_status in ('in_zone','available','selected_for_dig')) or

      -- =========================================================
      -- ROOT PRUNE SEQUENCE (selected -> prune1..4 -> ready)
      -- =========================================================
      (v_from = 'selected_for_dig' and p_to_status = 'root_prune_1') or
      (v_from = 'root_prune_1' and p_to_status = 'root_prune_2') or
      (v_from = 'root_prune_2' and p_to_status = 'root_prune_3') or
      (v_from = 'root_prune_3' and p_to_status = 'root_prune_4') or
      (v_from = 'root_prune_4' and p_to_status = 'ready_to_lift') or

      -- =========================================================
      -- LIFT / DUG
      -- =========================================================
      (v_from = 'ready_to_lift' and p_to_status = 'dug') or

      -- =========================================================
      -- POST-DUG DISPOSITIONS
      -- dug -> hold/stock/shipped/planted
      -- hold -> stock/shipped/planted
      -- stock -> shipped/planted
      -- =========================================================
      (v_from = 'dug' and p_to_status in ('dug_hold','in_stock','shipped','planted')) or
      (v_from = 'dug_hold' and p_to_status in ('in_stock','shipped','planted')) or
      (v_from = 'in_stock' and p_to_status in ('shipped','planted')) or

      -- =========================================================
      -- EXCEPTION STATES (allow from any status)
      -- =========================================================
      (p_to_status in ('rehab','dead'))
    ) then
      raise exception 'Invalid status transition: % -> % (tag_id=%)', v_from, p_to_status, p_tag_id;
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- Audit log
  ---------------------------------------------------------------------------
  insert into public.tree_tag_status_logs(tag_id, from_status, to_status, source, notes, changed_by)
  values (
    p_tag_id,
    v_from,
    p_to_status,
    coalesce(p_source,'ui'),
    case when p_force then coalesce(p_notes,'') || ' [FORCE]' else p_notes end,
    p_changed_by
  );

  ---------------------------------------------------------------------------
  -- Apply update
  ---------------------------------------------------------------------------
  update public.tree_tags
  set status = p_to_status,
      updated_at = now()
  where id = p_tag_id
  returning * into v_row;

  return v_row;
end
$function$;
