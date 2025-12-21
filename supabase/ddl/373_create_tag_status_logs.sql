-- 1. Create Log Table
create table if not exists public.tree_tag_status_logs (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tree_tags(id) on delete cascade,

  from_status text not null,
  to_status   text not null,

  notes text null,
  is_force boolean not null default false,

  source text null,          -- 'zone_bulk', 'tag_edit', 'stock', etc.
  changed_by uuid null,      -- auth.uid()
  changed_at timestamptz not null default now()
);

create index if not exists idx_tree_tag_status_logs_tag_id
  on public.tree_tag_status_logs(tag_id, changed_at desc);


-- 2. Update RPC to Log Changes
create or replace function public.set_tag_status_v1(
  p_tag_ids uuid[],
  p_next_status text,
  p_notes text default null,
  p_force boolean default false,
  p_source text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag_id uuid;
  v_current_status text;
  v_count integer := 0;
begin
  if p_tag_ids is null or array_length(p_tag_ids, 1) is null then
    return 0;
  end if;

  foreach v_tag_id in array p_tag_ids
  loop
    select status into v_current_status
    from public.tree_tags
    where id = v_tag_id;

    if not found then
      -- Instead of raising exception for bulk ops, we might want to skip? 
      -- But user snippet used raise exception 'Tag % not found'. 
      -- I will follow user snippet for consistency, or strictness.
      raise exception 'Tag % not found', v_tag_id;
    end if;

    if v_current_status = p_next_status then
      -- Skip if no change
      continue;
    end if;

    -- Strict flow only when not force
    if not p_force then
      -- 1. in_zone -> dig_ordered
      if p_next_status = 'dig_ordered' and v_current_status not in ('in_zone', 'available', 'selected_for_dig') then
         -- Note: expanded 'in_zone' to include legacy/other statuses if needed, 
         -- but user request snippet said: if p_next_status = 'dig_ordered' and v_current_status <> 'in_zone' then raise...
         -- But in frontend we allowed 'available' and 'selected_for_dig'. 
         -- I should stick to the strictest or what the user PROVIDED in the snippet.
         -- User provided snippet: "if p_next_status = 'dig_ordered' and v_current_status <> 'in_zone'"
         -- But in Step 325/340 we implemented strict frontend checks for ['in_zone', 'available', 'selected_for_dig'].
         -- If I use user's SQL snippet literally, it will FAIL for 'available' tags even if frontend allows.
         -- I will trust the USER's SQL snippet for now as they might want strictness.
         -- Actually, looking at the previous turn (Step 322), user asked: "บังคับ 'สั่งขุด' ให้ทำงานเฉพาะ in_zone จริงๆ".
         -- So I will use strict 'in_zone'.
         if v_current_status <> 'in_zone' then
            raise exception 'Tag %: expected in_zone, got %', v_tag_id, v_current_status;
         end if;
      end if;

      -- 2. dig_ordered -> dug
      if p_next_status = 'dug' and v_current_status <> 'dig_ordered' then
        raise exception 'Tag %: expected dig_ordered, got %', v_tag_id, v_current_status;
      end if;

      -- 3. dug -> ready_for_sale
      if p_next_status = 'ready_for_sale' and v_current_status <> 'dug' then
        raise exception 'Tag %: expected dug, got %', v_tag_id, v_current_status;
      end if;
    end if;

    -- Update
    update public.tree_tags
    set status = p_next_status,
        notes = coalesce(p_notes, notes),
        updated_at = now()
    where id = v_tag_id;

    -- Log
    insert into public.tree_tag_status_logs(
      tag_id, from_status, to_status, notes, is_force, source, changed_by, changed_at
    ) values (
      v_tag_id, v_current_status, p_next_status, p_notes, p_force,
      coalesce(p_source, 'set_tag_status_v1'),
      auth.uid(),
      now()
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
