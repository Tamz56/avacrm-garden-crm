create or replace function public.set_tag_status_v1(
  p_tag_ids uuid[],
  p_next_status text,
  p_notes text default null
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
    -- Get current status
    select status into v_current_status
    from public.tree_tags
    where id = v_tag_id;

    if not found then
      raise exception 'Tag % not found', v_tag_id;
    end if;

    -- Same status -> skip
    if v_current_status = p_next_status then
      continue;
    end if;

    -- Validation Rules (v1)
    
    -- 1. in_zone -> dig_ordered
    if p_next_status = 'dig_ordered' and v_current_status not in ('in_zone') then
       raise exception 'Tag %: Cannot change status from % to dig_ordered. Must be in_zone.', v_tag_id, v_current_status;
    end if;

    -- 2. dig_ordered -> dug
    if p_next_status = 'dug' and v_current_status not in ('dig_ordered') then
       raise exception 'Tag %: Cannot change status from % to dug. Must be dig_ordered.', v_tag_id, v_current_status;
    end if;

    -- 3. dug -> ready_for_sale
    if p_next_status = 'ready_for_sale' and v_current_status not in ('dug') then
       raise exception 'Tag %: Cannot change status from % to ready_for_sale. Must be dug.', v_tag_id, v_current_status;
    end if;

    -- Update
    update public.tree_tags
    set status = p_next_status,
        notes = coalesce(p_notes, notes),
        updated_at = now()
    where id = v_tag_id;
    
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
